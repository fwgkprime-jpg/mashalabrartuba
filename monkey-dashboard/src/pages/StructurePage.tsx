import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  DetailSurface,
  PageFrame,
  Stat,
  StatGrid,
} from "../components/layout/PageFrame";
import { PageState } from "../components/ui/PageState";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { StructureCurrentResponse } from "../domain/dashboardContracts";
import { statusForReliability } from "../domain/statusRegistry";
import { useStructureQuery } from "../hooks/useDashboardQueries";
import {
  formatCompact,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatPercent,
} from "../lib/format";
import styles from "./CorePages.module.css";

type StructureAssetKey = keyof StructureCurrentResponse["assets"];
type StructureAsset = StructureCurrentResponse["assets"][StructureAssetKey];
type CapabilityKey = keyof StructureAsset["capabilities"];

const ASSETS: readonly StructureAssetKey[] = ["BTC", "ETH"];

const CAPABILITIES: ReadonlyArray<{
  key: CapabilityKey;
  label: string;
  detail: string;
}> = [
  {
    key: "unsigned_walls_usable",
    label: "Unsigned walls",
    detail: "Ranked wall evidence can be displayed.",
  },
  {
    key: "unsigned_gamma_usable",
    label: "Unsigned gamma",
    detail: "Unsigned gamma context is usable.",
  },
  {
    key: "signed_regime_usable",
    label: "Signed regime",
    detail: "Signed regime interpretation is usable.",
  },
  {
    key: "expiry_context_usable",
    label: "Expiry context",
    detail: "Expiry context passed its usability checks.",
  },
];

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function optionalPrice(value: number | null): string {
  return value === null ? "Unavailable" : formatCurrency(value);
}

function optionalRange(value: readonly [number, number] | null): string {
  return value
    ? `${formatCurrency(value[0])} - ${formatCurrency(value[1])}`
    : "Unavailable";
}

function DemoLabel({ label }: { label: string }) {
  return <span className={styles.demoLabel}>{label}</span>;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button className={styles.secondaryButton} type="button" onClick={onRetry}>
      Retry request
    </button>
  );
}

function mockLabelFor(
  data: StructureCurrentResponse,
  asset?: StructureAsset,
): string | null {
  if (asset?.mock_only) return asset.mock_only.label;
  return data.meta.data_mode === "mock" ? data.meta.demo_label : null;
}

interface AssetSummaryProps {
  assetKey: StructureAssetKey;
  asset: StructureAsset;
  mockLabel: string | null;
  selected: boolean;
  onSelect: () => void;
}

function AssetSummary({
  assetKey,
  asset,
  mockLabel,
  selected,
  onSelect,
}: AssetSummaryProps) {
  return (
    <article
      className={`${styles.structureCard} ${selected ? styles.selectedAsset : ""}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-controls="structure-detail-drawer"
      >
        <span className={styles.structureCardHeader}>
          <span>
            <small>Market / gamma structure</small>
            <strong>{assetKey}</strong>
          </span>
          <StatusBadge status={statusForReliability(asset.data_reliability)} />
        </span>

        {mockLabel && <DemoLabel label={mockLabel} />}

        <span className={styles.assetPrice}>
          <small>{mockLabel ? "Demo current price" : "Current price"}</small>
          <strong>{optionalPrice(asset.current_price)}</strong>
        </span>

        <span className={styles.assetRangeSummary}>
          <span>
            <small>P80</small>
            <strong>{optionalRange(asset.p80)}</strong>
          </span>
          <span>
            <small>P90</small>
            <strong>{optionalRange(asset.p90)}</strong>
          </span>
        </span>

        <span className={styles.assetFooter}>
          <span>{humanize(asset.market_structure)}</span>
          <span>{formatDuration(asset.age_seconds)} old</span>
        </span>
      </button>
    </article>
  );
}

function CapabilityList({
  capabilities,
}: {
  capabilities: StructureAsset["capabilities"];
}) {
  return (
    <ul className={styles.capabilityList}>
      {CAPABILITIES.map((capability) => {
        const usable = capabilities[capability.key];
        return (
          <li key={capability.key}>
            <span>
              <strong>{capability.label}</strong>
              <small>{capability.detail}</small>
            </span>
            <StatusBadge status={usable ? "ACTIVE" : "UNAVAILABLE"} />
          </li>
        );
      })}
    </ul>
  );
}

function GammaWalls({ asset }: { asset: StructureAsset }) {
  if (asset.gamma_walls.length === 0) {
    return (
      <PageState
        kind="empty"
        title="No gamma walls"
        message="The structure response did not return usable wall records for this asset."
      />
    );
  }

  return (
    <ol className={styles.wallList}>
      {asset.gamma_walls.map((wall) => (
        <li key={wall.field_id}>
          <header className={styles.wallHeader}>
            <span>
              <small>Rank {wall.rank}</small>
              <strong>{formatCurrency(wall.strike)}</strong>
            </span>
            <span>{wall.option_types_present.join(" + ")}</span>
          </header>

          <dl className={styles.wallMetrics}>
            <div>
              <dt>Basis</dt>
              <dd>{humanize(wall.basis)}</dd>
            </div>
            <div>
              <dt>Mass</dt>
              <dd>
                {formatCompact(wall.mass)} {humanize(wall.mass_unit)}
              </dd>
            </div>
            <div>
              <dt>Basis share</dt>
              <dd>{formatPercent(wall.share_of_basis_total * 100, 1)}</dd>
            </div>
            <div>
              <dt>Expiry</dt>
              <dd>{formatDateTime(wall.expiry_utc)}</dd>
            </div>
            <div>
              <dt>Distance to origin spot</dt>
              <dd>{formatCurrency(wall.distance_to_fortnite_origin_spot)}</dd>
            </div>
            <div>
              <dt>Distance to P80</dt>
              <dd>
                {formatCurrency(wall.distance_to_p80_lower)} /{" "}
                {formatCurrency(wall.distance_to_p80_upper)}
              </dd>
            </div>
            <div>
              <dt>Distance to P90</dt>
              <dd>
                {formatCurrency(wall.distance_to_p90_lower)} /{" "}
                {formatCurrency(wall.distance_to_p90_upper)}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ol>
  );
}

interface StructureDrawerProps {
  data: StructureCurrentResponse;
  assetKey: StructureAssetKey;
  onClose: () => void;
}

function StructureDrawer({ data, assetKey, onClose }: StructureDrawerProps) {
  const asset = data.assets[assetKey];
  const mockLabel = mockLabelFor(data, asset);
  return (
    <div id="structure-detail-drawer" className={styles.drawerContent}>
      <header className={styles.drawerHeader}>
        <div>
          <span>Selected structure</span>
          <h2>{assetKey}</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close structure details"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <div className={styles.drawerCues}>
        <StatusBadge status={statusForReliability(asset.data_reliability)} />
        {data.meta.stale && <StatusBadge status="STALE" />}
        {mockLabel && <DemoLabel label={mockLabel} />}
      </div>

      <StatGrid>
        <Stat
          label={mockLabel ? "Demo current price" : "Current price"}
          value={optionalPrice(asset.current_price)}
        />
        <Stat
          label="FORTNITE origin spot"
          value={optionalPrice(asset.origin_spot)}
        />
        <Stat label="P80 range" value={optionalRange(asset.p80)} />
        <Stat label="P90 range" value={optionalRange(asset.p90)} />
        <Stat
          label="Market structure"
          value={humanize(asset.market_structure)}
        />
        <Stat label="Reliability" value={humanize(asset.data_reliability)} />
        <Stat
          label="Freshness"
          value={`${formatDuration(asset.age_seconds)} old`}
          detail={formatDateTime(asset.as_of_utc)}
        />
        <Stat
          label="Expiry"
          value={
            asset.expiry_utc ? formatDateTime(asset.expiry_utc) : "Unavailable"
          }
        />
      </StatGrid>

      <section className={styles.drawerSection}>
        <h3>Evidence capabilities</h3>
        <CapabilityList capabilities={asset.capabilities} />
      </section>

      <section className={styles.drawerSection}>
        <div className={styles.drawerSectionHeader}>
          <h3>Gamma walls</h3>
          <span>{asset.gamma_walls.length} records</span>
        </div>
        <GammaWalls asset={asset} />
      </section>
    </div>
  );
}

export function StructurePage() {
  const query = useStructureQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedAsset = searchParams.get("asset");
  const selectedAsset: StructureAssetKey | null =
    requestedAsset === "BTC" || requestedAsset === "ETH"
      ? requestedAsset
      : null;
  const data = query.data;

  const selectAsset = (asset: StructureAssetKey) => {
    const next = new URLSearchParams(searchParams);
    next.set("asset", asset);
    setSearchParams(next);
  };

  const closeAsset = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("asset");
    setSearchParams(next);
  };

  const headerStatus = data ? (
    <span className={styles.badgeRow}>
      <StatusBadge status={data.meta.stale ? "STALE" : "ACTIVE"} />
      {data.meta.data_mode === "mock" && (
        <DemoLabel label={data.meta.demo_label} />
      )}
    </span>
  ) : undefined;

  return (
    <PageFrame
      eyebrow="Market evidence"
      title="Structure"
      description="Read-only BTC and ETH price ranges, ranked gamma walls, expiry context, reliability, and explicit evidence capabilities."
      accent="purple"
      status={headerStatus}
    >
      {data?.meta.stale && (
        <p className={styles.staleBanner} role="status">
          Structure evidence is stale. Ages and timestamps are shown so this
          snapshot is not mistaken for current production telemetry.
        </p>
      )}

      <DetailSurface
        eyebrow="BTC / ETH"
        title="Current market structure"
        meta={
          data && (
            <time dateTime={data.meta.observed_at_utc}>
              {formatDateTime(data.meta.observed_at_utc)}
            </time>
          )
        }
        aside={
          data && selectedAsset ? (
            <StructureDrawer
              data={data}
              assetKey={selectedAsset}
              onClose={closeAsset}
            />
          ) : undefined
        }
      >
        {query.isLoading && !data ? (
          <PageState kind="loading" title="Loading market structure" />
        ) : query.isError && !data ? (
          <PageState
            kind="error"
            title="Market structure unavailable"
            action={<RetryButton onRetry={() => void query.refetch()} />}
          />
        ) : data ? (
          <>
            {query.isError && (
              <p className={styles.refreshNotice}>
                Structure refresh failed; showing cached data.
              </p>
            )}
            <div className={styles.structureIntro} role="note">
              <strong>Select an asset for full evidence detail.</strong>
              <span>
                Ranges, walls, and capability flags are reproduced from the
                validated response without trading interpretation.
              </span>
            </div>
            <div className={styles.structureGrid}>
              {ASSETS.map((assetKey) => (
                <AssetSummary
                  key={assetKey}
                  assetKey={assetKey}
                  asset={data.assets[assetKey]}
                  mockLabel={mockLabelFor(data, data.assets[assetKey])}
                  selected={selectedAsset === assetKey}
                  onSelect={() => selectAsset(assetKey)}
                />
              ))}
            </div>
          </>
        ) : (
          <PageState kind="empty" title="No structure snapshot" />
        )}
      </DetailSurface>
    </PageFrame>
  );
}

export default StructurePage;
