import { useId, type CSSProperties } from "react";
import { Link } from "react-router-dom";

import styles from "./CityScene.module.css";

export type CityModuleId =
  | "monkey"
  | "structure"
  | "order-history"
  | "crab-recommendations"
  | "crab-notes"
  | "fix-code"
  | "diary";

export type CityAccent = "cyan" | "blue" | "violet" | "magenta" | "orange";

export type CityStatusTone = "positive" | "warning" | "danger" | "muted";

export interface CityCoreSummary {
  /** Route opened when the central hub is activated. */
  to: string;
  status: string;
  statusTone?: CityStatusTone;
  title?: string;
  subtitle?: string;
  runId?: string;
  stage?: string;
  progress?: number;
  lastRun?: string;
  ariaLabel?: string;
}

export interface CityModuleSpec<Id extends CityModuleId = CityModuleId> {
  id: Id;
  title: string;
  subtitle: string;
  to: string;
  status: string;
  statusTone?: CityStatusTone;
  accent?: CityAccent;
  meta?: string;
  ariaLabel?: string;
}

/** A tuple intentionally constrained to the seven canonical city modules. */
export type SevenCityModules = readonly [
  CityModuleSpec<"monkey">,
  CityModuleSpec<"structure">,
  CityModuleSpec<"order-history">,
  CityModuleSpec<"crab-recommendations">,
  CityModuleSpec<"crab-notes">,
  CityModuleSpec<"fix-code">,
  CityModuleSpec<"diary">,
];

export interface CitySceneProps {
  core: CityCoreSummary;
  modules: SevenCityModules;
  className?: string;
  ariaLabel?: string;
}

const DEFAULT_ACCENTS: Record<CityModuleId, CityAccent> = {
  monkey: "magenta",
  structure: "violet",
  "order-history": "cyan",
  "crab-recommendations": "blue",
  "crab-notes": "violet",
  "fix-code": "cyan",
  diary: "orange",
};

const ACCENT_CLASS: Record<CityAccent, string> = {
  cyan: styles.accentCyan,
  blue: styles.accentBlue,
  violet: styles.accentViolet,
  magenta: styles.accentMagenta,
  orange: styles.accentOrange,
};

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

function moduleAccessibleName(module: CityModuleSpec): string {
  if (module.ariaLabel) return module.ariaLabel;

  const detail = module.meta ? ` ${module.meta}.` : "";
  return `${module.title}. ${module.subtitle}. Status: ${module.status}.${detail}`;
}

function coreAccessibleName(core: CityCoreSummary): string {
  if (core.ariaLabel) return core.ariaLabel;

  const title = core.title ?? "MONKEY CORE";
  const run = core.runId ? ` Run ${core.runId}.` : "";
  const stage = core.stage ? ` Current stage ${core.stage}.` : "";
  return `${title}. Status: ${core.status}.${run}${stage}`;
}

interface SceneBackdropProps {
  idPrefix: string;
}

function SceneBackdrop({ idPrefix }: SceneBackdropProps) {
  const gridId = `${idPrefix}-grid`;
  const groundId = `${idPrefix}-ground`;
  const hazeId = `${idPrefix}-haze`;

  return (
    <svg
      className={styles.backdrop}
      viewBox="0 0 1200 675"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={gridId}
          width="42"
          height="42"
          patternUnits="userSpaceOnUse"
        >
          <path d="M21 0 42 10.5 21 21 0 10.5Z" className={styles.gridCell} />
          <path
            d="M21 21 42 31.5 21 42 0 31.5Z"
            className={styles.gridCellFaint}
          />
        </pattern>
        <linearGradient id={groundId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12254b" stopOpacity=".52" />
          <stop offset=".48" stopColor="#080d1b" stopOpacity=".92" />
          <stop offset="1" stopColor="#24104a" stopOpacity=".48" />
        </linearGradient>
        <radialGradient id={hazeId} cx="50%" cy="48%" r="58%">
          <stop offset="0" stopColor="#0aa8ff" stopOpacity=".19" />
          <stop offset=".42" stopColor="#2520a5" stopOpacity=".09" />
          <stop offset="1" stopColor="#020407" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="600" cy="365" rx="500" ry="284" fill={`url(#${hazeId})`} />
      <path
        d="M600 176 1040 396 600 616 160 396Z"
        fill={`url(#${groundId})`}
        className={styles.cityGround}
      />
      <path
        d="M600 176 1040 396 600 616 160 396Z"
        fill={`url(#${gridId})`}
        opacity=".34"
      />

      <g className={styles.radarLines}>
        <ellipse cx="600" cy="350" rx="104" ry="52" />
        <ellipse cx="600" cy="350" rx="196" ry="98" />
        <ellipse cx="600" cy="350" rx="316" ry="158" />
        <path d="M600 176V616M160 396H1040" />
        <path d="M286 238 914 552M914 238 286 552" />
        <path className={styles.radarSweep} d="M600 350 800 250" />
      </g>

      <g className={styles.roadNetwork}>
        <path
          className={styles.roadBase}
          d="M600 322 386 216 244 286 458 394 600 322Z"
        />
        <path
          className={styles.roadBase}
          d="M600 322 811 220 958 292 744 398 600 322Z"
        />
        <path
          className={styles.roadBase}
          d="M458 394 250 496 390 568 600 462"
        />
        <path
          className={styles.roadBase}
          d="M744 398 948 500 812 570 600 462"
        />
        <path className={styles.roadBase} d="M600 462V614" />

        <path
          className={styles.dataLine}
          d="M600 322 386 216 244 286 458 394 600 322Z"
        />
        <path
          className={styles.dataLineAlt}
          d="M600 322 811 220 958 292 744 398 600 322Z"
        />
        <path
          className={styles.dataLine}
          d="M458 394 250 496 390 568 600 462"
        />
        <path
          className={styles.dataLineAlt}
          d="M744 398 948 500 812 570 600 462"
        />
        <path className={styles.dataLineOrange} d="M600 462V614" />
      </g>

      <g className={styles.signalNodes}>
        <circle cx="386" cy="216" r="4" />
        <circle cx="811" cy="220" r="4" />
        <circle cx="250" cy="496" r="4" />
        <circle cx="948" cy="500" r="4" />
        <circle cx="600" cy="614" r="4" className={styles.orangeNode} />
      </g>

      <g className={styles.particles}>
        <circle cx="174" cy="323" r="2.1" style={{ animationDelay: "-1.2s" }} />
        <circle cx="302" cy="190" r="1.6" style={{ animationDelay: "-3.7s" }} />
        <circle cx="464" cy="134" r="1.8" style={{ animationDelay: "-2.1s" }} />
        <circle cx="710" cy="144" r="2.2" style={{ animationDelay: "-5.4s" }} />
        <circle cx="930" cy="236" r="1.5" style={{ animationDelay: "-4.2s" }} />
        <circle cx="1060" cy="408" r="2" style={{ animationDelay: "-.5s" }} />
        <circle cx="842" cy="606" r="1.8" style={{ animationDelay: "-2.8s" }} />
        <circle cx="348" cy="612" r="1.7" style={{ animationDelay: "-4.9s" }} />
      </g>
    </svg>
  );
}

function ModuleBuilding({ id }: { id: CityModuleId }) {
  return (
    <svg
      className={styles.buildingArt}
      viewBox="0 0 190 160"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
      data-building={id}
    >
      <polygon
        className={styles.platformShadow}
        points="95 80 183 122 95 158 7 122"
      />
      <polygon
        className={styles.platformTop}
        points="95 70 177 109 95 148 13 109"
      />
      <path className={styles.platformTrace} d="M25 109 95 76l70 33-70 33Z" />
      <path
        className={styles.platformTraceInner}
        d="M40 109 95 83l55 26-55 26Z"
      />

      <polygon
        className={styles.buildingLeft}
        points="48 61 95 84 95 130 48 107"
      />
      <polygon
        className={styles.buildingRight}
        points="95 84 145 60 145 106 95 130"
      />
      <polygon
        className={styles.buildingRoof}
        points="95 37 145 60 95 84 48 61"
      />
      <polygon className={styles.roofInset} points="95 45 131 61 95 77 62 61" />
      <path
        className={styles.roofCircuit}
        d="M70 60 88 51l13 6 13-6 15 7-18 9-16-7-14 7Z"
      />

      <g className={styles.windowGrid}>
        <path d="M56 72v27M66 77v27M77 81v28M87 86v27" />
        <path d="M103 88v28M115 82v28M127 76v28M138 70v28" />
        <path d="m53 91 37 18M101 104l40-19" />
      </g>
      <path
        className={styles.doorGlow}
        d="M84 111v12l11 5v-13ZM106 110v13l-11 5v-13Z"
      />
      <path className={styles.antenna} d="M95 37V24m-7 5 7-5 8 5" />
      <circle className={styles.beacon} cx="95" cy="23" r="2.8" />
    </svg>
  );
}

function CoreBuilding() {
  return (
    <svg
      className={styles.coreArt}
      viewBox="0 0 300 350"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        className={styles.coreHaloOuter}
        cx="150"
        cy="95"
        rx="62"
        ry="30"
      />
      <ellipse
        className={styles.coreHaloInner}
        cx="150"
        cy="95"
        rx="42"
        ry="20"
      />
      <path
        className={styles.coreBeacon}
        d="M150 97 104 58m46 39 46-39M150 97V38"
      />

      <polygon
        className={styles.corePlatformShadow}
        points="150 214 287 281 150 345 13 281"
      />
      <polygon
        className={styles.corePlatform}
        points="150 200 278 262 150 325 22 262"
      />
      <path
        className={styles.corePlatformTrace}
        d="m43 262 107-51 107 51-107 51Z"
      />
      <path
        className={styles.corePlatformTraceInner}
        d="m67 262 83-39 83 39-83 39Z"
      />

      <polygon
        className={styles.coreLeft}
        points="73 148 150 185 150 287 73 250"
      />
      <polygon
        className={styles.coreRight}
        points="150 185 229 147 229 249 150 287"
      />
      <polygon
        className={styles.coreRoof}
        points="150 111 229 147 150 185 73 148"
      />
      <polygon
        className={styles.coreRoofInset}
        points="150 124 206 149 150 174 96 149"
      />

      <g className={styles.coreWindows}>
        <path d="M84 166v65M99 173v67M116 181v67M133 189v68" />
        <path d="M166 188v69M184 179v69M201 170v68M217 163v67" />
        <path d="m80 210 63 31M158 240l66-32" />
      </g>
      <path
        className={styles.coreDoors}
        d="M126 248v27l24 12v-28ZM176 247v28l-26 12v-28Z"
      />

      <g className={styles.coreEmblem}>
        <path d="m150 54-30 13 5 35 25 18 25-18 5-35Z" />
        <path d="m126 70 18 7-12 16m42-23-18 7 12 16M144 77l6 29 6-29" />
        <path d="m139 104 11 7 11-7" />
      </g>
    </svg>
  );
}

export function CityScene({
  core,
  modules,
  className,
  ariaLabel = "MONKEY system city overview",
}: CitySceneProps) {
  const svgId = useId().replace(/:/g, "");
  const rootClassName = [styles.scene, className].filter(Boolean).join(" ");
  const progress =
    typeof core.progress === "number"
      ? clampProgress(core.progress)
      : undefined;

  return (
    <section className={rootClassName} aria-label={ariaLabel}>
      <h2 className={styles.srOnly}>{ariaLabel}</h2>

      <div className={styles.cityCanvas}>
        <SceneBackdrop idPrefix={svgId} />

        <Link
          to={core.to}
          className={`${styles.coreLink} ${styles.accentCyan}`}
          data-status-tone={core.statusTone ?? "positive"}
          aria-label={coreAccessibleName(core)}
        >
          <span className={styles.coreCard}>
            <span className={styles.coreHeadingRow}>
              <span>
                <span className={styles.coreTitle}>
                  {core.title ?? "MONKEY CORE"}
                </span>
                <span className={styles.coreSubtitle}>
                  {core.subtitle ?? "Central Hub"}
                </span>
              </span>
              <span className={styles.statusChip}>
                <span className={styles.statusLed} aria-hidden="true" />
                {core.status}
              </span>
            </span>

            {(core.runId || core.stage || core.lastRun) && (
              <span className={styles.coreDetails} aria-hidden="true">
                {core.runId && (
                  <span>
                    <small>RUN</small>
                    {core.runId}
                  </span>
                )}
                {core.stage && (
                  <span>
                    <small>STAGE</small>
                    {core.stage}
                  </span>
                )}
                {core.lastRun && (
                  <span>
                    <small>LAST</small>
                    {core.lastRun}
                  </span>
                )}
              </span>
            )}

            {progress !== undefined && (
              <span
                className={styles.progressTrack}
                role="progressbar"
                aria-label="Current run progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span
                  className={styles.progressFill}
                  style={{ width: `${progress}%` } as CSSProperties}
                />
              </span>
            )}
          </span>
          <CoreBuilding />
        </Link>

        <nav className={styles.moduleNav} aria-label="City modules">
          <ul className={styles.moduleList}>
            {modules.map((module, index) => {
              const accent = module.accent ?? DEFAULT_ACCENTS[module.id];

              return (
                <li
                  className={styles.moduleItem}
                  data-module={module.id}
                  key={`${module.id}-${index}`}
                >
                  <Link
                    to={module.to}
                    className={`${styles.moduleLink} ${ACCENT_CLASS[accent]}`}
                    data-status-tone={module.statusTone ?? "positive"}
                    aria-label={moduleAccessibleName(module)}
                  >
                    <span className={styles.moduleCard}>
                      <span className={styles.moduleTitle}>{module.title}</span>
                      <span className={styles.moduleMetaRow}>
                        <span className={styles.moduleSubtitle}>
                          {module.subtitle}
                        </span>
                        <span className={styles.statusChip}>
                          <span
                            className={styles.statusLed}
                            aria-hidden="true"
                          />
                          {module.status}
                        </span>
                      </span>
                      {module.meta && (
                        <span className={styles.moduleMeta}>{module.meta}</span>
                      )}
                    </span>
                    <ModuleBuilding id={module.id} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}

export default CityScene;
