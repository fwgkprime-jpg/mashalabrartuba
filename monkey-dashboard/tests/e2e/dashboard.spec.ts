import { expect, test, type Page } from '@playwright/test';

interface PageObservations {
  runtimeErrors: string[];
  apiWriteRequests: string[];
  forbiddenSubmissionRequests: string[];
}

interface RouteSpec {
  path: string;
  navLabel: string;
  heading: string | RegExp;
}

const observations = new WeakMap<Page, PageObservations>();
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_FORECAST_SELECTION = /^\/api\/v1\/order-history\/[^/]+\/select\/?$/i;
const TRADING_ENDPOINT =
  /(?:^|\/)(?:orders?|trades?|trading|positions?|executions?|brokers?|exchanges?|submit-order|place-order)(?:\/|$)/i;

const BUILDING_ROUTES: readonly RouteSpec[] = [
  { path: '/monkey', navLabel: 'Monkey', heading: 'MONKEY' },
  { path: '/structure', navLabel: 'Structure', heading: 'Structure' },
  { path: '/order-history', navLabel: 'Order History', heading: 'Order History' },
  {
    path: '/crab-recommendations',
    navLabel: 'Recommendations',
    heading: 'Crab Recommendations',
  },
  { path: '/crab-notes', navLabel: 'Crab Notes', heading: 'Crab Notes' },
  { path: '/fix-code', navLabel: 'Fix Code', heading: 'Fix Code' },
  { path: '/diary', navLabel: 'Diary', heading: 'Diary' },
];

const MOBILE_ROUTES: readonly RouteSpec[] = [
  ...BUILDING_ROUTES,
  { path: '/activity', navLabel: 'Activity', heading: 'Activity' },
  { path: '/settings', navLabel: 'Settings', heading: 'Settings' },
  { path: '/', navLabel: 'City', heading: 'City Overview' },
  {
    path: '/login',
    navLabel: 'Login',
    heading: /Private operations/i,
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function routePattern(path: string): RegExp {
  return path === '/'
    ? /\/$/
    : new RegExp(`${escapeRegex(path)}\/?$`);
}

function isMobileProject(projectName: string): boolean {
  return projectName.toLowerCase().includes('mobile');
}

function pageObservations(page: Page): PageObservations {
  const state = observations.get(page);
  if (!state) throw new Error('Page observations were not initialized.');
  return state;
}

async function expectRoute(page: Page, route: RouteSpec): Promise<void> {
  await expect(page).toHaveURL(routePattern(route.path));
  await expect(
    page.getByRole('heading', { level: 1, name: route.heading }),
  ).toBeVisible();
}

async function openCity(page: Page): Promise<void> {
  await page.goto('/');
  await expectRoute(page, {
    path: '/',
    navLabel: 'City',
    heading: 'City Overview',
  });
  await expect(
    page.getByRole('navigation', { name: 'City modules' }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  const state: PageObservations = {
    runtimeErrors: [],
    apiWriteRequests: [],
    forbiddenSubmissionRequests: [],
  };
  observations.set(page, state);

  page.on('pageerror', (error) => {
    state.runtimeErrors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      state.runtimeErrors.push(`console.error: ${message.text()}`);
    }
  });

  page.on('request', (request) => {
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const requestLabel = `${method} ${url.pathname}`;

    if (MUTATING_METHODS.has(method) && url.pathname.startsWith('/api/')) {
      state.apiWriteRequests.push(requestLabel);
    }

    if (
      MUTATING_METHODS.has(method) &&
      TRADING_ENDPOINT.test(url.pathname) &&
      !ALLOWED_FORECAST_SELECTION.test(url.pathname)
    ) {
      state.forbiddenSubmissionRequests.push(requestLabel);
    }
  });
});

test.afterEach(async ({ page }) => {
  const state = pageObservations(page);
  expect(
    state.forbiddenSubmissionRequests,
    'No request may reach a trading or order-submission endpoint. The only permitted API write shape is /api/v1/order-history/:id/select.',
  ).toEqual([]);
  expect(
    state.runtimeErrors,
    'The page emitted a pageerror or console.error.',
  ).toEqual([]);
});

test('City Overview opens in explicit demo mode with the MONKEY core', async ({
  page,
}) => {
  await openCity(page);

  await expect(
    page.getByText('DEMO / MOCK DATA', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /^MONKEY CORE\./i }),
  ).toBeVisible();
});

test('all requested routes are reachable through buildings or the mobile menu', async ({
  page,
}, testInfo) => {
  await openCity(page);

  if (isMobileProject(testInfo.project.name)) {
    for (const route of MOBILE_ROUTES) {
      const menuButton = page.getByRole('button', {
        name: 'Open navigation',
      });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

      const navigation = page.getByRole('navigation', { name: 'Primary' });
      const link = navigation.getByRole('link', {
        name: route.navLabel,
        exact: true,
      });
      await expect(link).toBeVisible();
      await link.click();
      await expectRoute(page, route);
    }
    return;
  }

  const coreLink = page.getByRole('link', { name: /^MONKEY CORE\./i });
  await coreLink.click();
  await expectRoute(page, BUILDING_ROUTES[0]);

  for (const route of BUILDING_ROUTES) {
    await openCity(page);
    const cityNavigation = page.getByRole('navigation', {
      name: 'City modules',
    });
    const building = cityNavigation.locator(`a[href="${route.path}"]`);
    await expect(building).toHaveCount(1);
    await expect(building).toBeVisible();
    await building.click();
    await expectRoute(page, route);
  }

  const nonBuildingRoutes: readonly RouteSpec[] = [
    { path: '/activity', navLabel: 'Activity', heading: 'Activity' },
    { path: '/settings', navLabel: 'Settings', heading: 'Settings' },
    {
      path: '/login',
      navLabel: 'Login',
      heading: /Private operations/i,
    },
  ];

  for (const route of nonBuildingRoutes) {
    await openCity(page);
    const link = page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: route.navLabel, exact: true });
    await link.click();
    await expectRoute(page, route);
  }
});

test('selecting an Order History forecast remains local and visibly selected', async ({
  page,
}) => {
  await page.goto('/order-history');
  await expectRoute(page, {
    path: '/order-history',
    navLabel: 'Order History',
    heading: 'Order History',
  });
  await expect(
    page.getByText('DEMO / MOCK DATA', { exact: true }),
  ).toBeVisible();

  const availableChoice = page
    .getByRole('checkbox', { name: /^Select .+ forecast$/i })
    .and(page.locator(':not(:disabled):not(:checked)'))
    .first();
  await expect(availableChoice).toBeVisible();
  const accessibleName = await availableChoice.getAttribute('aria-label');
  expect(accessibleName).toBeTruthy();

  await availableChoice.check();

  const selectedChoice = page.getByRole('checkbox', {
    name: accessibleName!,
    exact: true,
  });
  await expect(selectedChoice).toBeChecked();
  await expect(selectedChoice.locator('xpath=ancestor::tr')).toContainText(
    'Selected',
  );

  expect(
    pageObservations(page).apiWriteRequests,
    'Mock selection must stay in browser storage and issue no API write.',
  ).toEqual([]);
});

test('a Crab Note opens in its manual-review drawer', async ({ page }) => {
  await page.goto('/crab-notes');
  await expectRoute(page, {
    path: '/crab-notes',
    navLabel: 'Crab Notes',
    heading: 'Crab Notes',
  });

  const note = page
    .getByRole('button', {
      name: /Fail-closed publication is intentional/i,
    })
    .first();
  await expect(note).toBeVisible();
  await note.click();
  await expect(note).toHaveAttribute('aria-pressed', 'true');

  const drawer = page.getByRole('complementary', {
    name: 'OpenClaw notes details',
  });
  await expect(
    drawer.getByRole('heading', {
      name: 'Fail-closed publication is intentional',
    }),
  ).toBeVisible();
});

test('Diary opens a first-person entry as safe detail content', async ({ page }) => {
  await page.goto('/diary');
  await expectRoute(page, {
    path: '/diary',
    navLabel: 'Diary',
    heading: 'Diary',
  });

  const entry = page
    .getByRole('button', { name: /I kept the boundary intact/i })
    .first();
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(entry).toHaveAttribute('aria-pressed', 'true');

  const drawer = page.getByRole('complementary', {
    name: 'OpenClaw entries details',
  });
  await expect(
    drawer.getByRole('heading', { name: 'I kept the boundary intact' }),
  ).toBeVisible();
});

test('mobile layouts do not create document-level horizontal overflow', async ({
  page,
}, testInfo) => {
  test.skip(
    !isMobileProject(testInfo.project.name),
    'This assertion targets the configured mobile project.',
  );

  for (const path of ['/', '/order-history', '/diary']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
    }));
    expect(
      dimensions.scrollWidth,
      `${path} must fit the mobile document width`,
    ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
});

test('keyboard navigation reaches and activates the MONKEY CORE link', async ({
  page,
}, testInfo) => {
  test.skip(
    isMobileProject(testInfo.project.name),
    'The desktop project verifies the full city keyboard order.',
  );
  await openCity(page);

  const coreLink = page.getByRole('link', { name: /^MONKEY CORE\./i });
  await expect(coreLink).toBeVisible();

  let reachedCore = false;
  for (let index = 0; index < 60; index += 1) {
    await page.keyboard.press('Tab');
    reachedCore = await coreLink.evaluate(
      (element) => element === document.activeElement,
    );
    if (reachedCore) break;
  }

  expect(reachedCore, 'Tab order should reach the MONKEY CORE route link.').toBe(
    true,
  );
  await expect(coreLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expectRoute(page, BUILDING_ROUTES[0]);
});

test('reduced-motion preference keeps city routes usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openCity(page);

  await expect
    .poll(() =>
      page.evaluate(() =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    )
    .toBe(true);

  const structureBuilding = page
    .getByRole('navigation', { name: 'City modules' })
    .locator('a[href="/structure"]');
  await expect(structureBuilding).toBeVisible();
  await structureBuilding.focus();
  await page.keyboard.press('Enter');
  await expectRoute(page, BUILDING_ROUTES[1]);
});
