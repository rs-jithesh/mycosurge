---
name: math-mcp
description: Accurate symbolic and numerical math via the math-mcp server (SymPy/SciPy). Use for solving equations, derivatives/integrals, simplifying or factoring expressions, numeric evaluation, unit conversion, ODEs, statistics (describe_data, ttest, correlation, linear_regression, moving_average), and plotting. Handy in Mycosurge for balance formulas and cost curves, idle/offline growth models, combat steering math, and playtest telemetry — instead of guessing arithmetic.
---

# Math MCP Usage

`math-mcp` exposes SymPy/SciPy through a 4-tool meta interface. Use it whenever a
task needs a correct numerical or symbolic result rather than an estimate.

## Tool Interface (4 tools)

| Tool           | Purpose                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **math_ls**    | List tools. No args: categories + flat list (name, intent). With `category`: full descriptors for that category.           |
| **math_man**   | Full descriptor (name, description, inputSchema) for one internal tool.                                                    |
| **math**       | Run one internal tool: `math(name, arguments)`. Use names from `math_ls()`.                                                |
| **math_batch** | Run multiple internal tools in one request. Pass `calls`: list of `{name, arguments}` (max 64); results in the same order. |

**Discovery flow:** Call `math_ls()` to see all 26 internal tools and categories. Use
`math_man(name)` for one tool's parameters, or `math_ls(category)` for a full category.
**Category ids:** `algebra`, `calculus`, `numbers`, `stats`, `ode`, `charts`, `output`.
Then call `math(name, arguments)` (or `math_batch` for independent calls).

## When to Use in Mycosurge

- **Balance formulas & cost curves** — generator costs (`baseCost * costScale^level` in
  `packages/config/src/generators.ts`), reach costs, skill-point budgets. Tools: `solve`,
  `evaluate`, `factor`, `describe_data`, `linear_regression`, `moving_average`.
- **Idle/offline modelling** — exponential growth, breakpoints, and decay curves
  (`packages/game-engine/src/offline.ts`, `phase.ts`). Tools: `solve_ode`, `evaluate`,
  `plot_ode_solution`.
- **Combat math** — steering/dodge geometry and turn-rate smoothing in
  `packages/game-engine/src/combat-ai.ts`. Tools: `derivative`, `find_root`, `simplify`.
- **Playtest/telemetry** — comparing samples or trends. Tools: `ttest`, `correlation`,
  `describe_data`, plotting.

## Problem Classification Guide

Users phrase questions as word problems, not mathematical expressions — interpret the
underlying question and classify it:

### Statistical Problems

**Indicators:** distributions, comparisons, averages, percentiles, significance, variability.
**Tools:** `describe_data`, `ttest`, `plot_histogram`, `plot_bar`, `moving_average`.

### Linear/Regression Problems

**Indicators:** relationships, correlations, trends, predictions, forecasting.
**Tools:** `correlation`, `linear_regression`, `plot_scatter`, `plot_timeseries`.

### Symbolic/Algebraic Problems

**Indicators:** equations, expressions, derivatives, integrals, symbolic manipulation.
**Tools:** `solve`, `simplify`, `expand`, `factor`, `derivative`, `integral`, `evaluate`.

For complex problems, break into sub-problems, classify each, and chain the tools.

## Quick Calculations vs. Datasets

This server runs over **stdio** for this repo, so:

- **Quick, one-off calculations** (e.g. evaluating a balance formula or finding a curve
  breakpoint): call `math(...)` / `math_batch(...)` directly. You do **not** need the
  DuckDB pipeline.
- **Real datasets** (hundreds+ of rows, multiple metrics, joins/aggregation): use the
  data pipeline below so raw data never gets processed in LLM context.
- **Charts over stdio** come back as inline base64 images — no `download_url`/curl step.
  (The HTTP-mode `download_url` + curl flow in `references/` only applies if the server
  is run in HTTP mode.)

## Data Preparation (for dataset analysis)

Execute BEFORE any dataset-level analysis:

1. **Create a timestamped analysis folder + DuckDB database** under project tmp:
   `{project_root}/tmp/{YYYYMMDD}_{HHMMSS}/`
2. **Use jq** for JSON extraction and reshaping.
3. **Use DuckDB** as the central data store — load intermediates as named tables.
4. **Use DuckDB SQL** for aggregation, filtering, and joining.
5. **Export CSV/JSON from DuckDB** for Math MCP consumption.
6. **Pipeline:** raw source → jq → DuckDB table → SQL → CSV export → Math MCP.

For full detail see [references/data-preparation.md](references/data-preparation.md).

## Analysis Workflow

**Do not submit all data or a complex multi-step analysis in a single MCP call.**
Follow discrete steps:

1. **Initial exploration** — `describe_data` for summary statistics.
2. **Visual understanding** — choose ONE appropriate plot.
3. **Targeted analysis** — ONE specific analysis based on observed patterns.
4. **Additional visualization** — if needed.

**Key principles:** one tool call per step; one question per step; one variable comparison
at a time; sample large datasets; let DuckDB SQL do aggregation.

See [references/analysis-workflow.md](references/analysis-workflow.md).

## Visualization

**Design for perception, not preference.** Every choice should transfer quantitative
understanding accurately.

**Quick reference (internal tool names; call via `math(name, arguments)`):**

- **Time-series** → `plot_timeseries`
- **Categorical comparison** → `plot_bar` (horizontal preferred)
- **Distribution** → `plot_histogram`
- **Correlation (2 vars)** → `plot_scatter`
- **Ranking** → `plot_bar` (sorted by value)

**Critical design rules:** position encodes quantity; start bar graphs at zero; order data
meaningfully; minimize non-data ink; label directly when possible; never use pie charts or
3D effects; format time labels at the chart's granularity; indicate timezone when using
timestamps.

See [references/visualization.md](references/visualization.md).

## Batched Requests

Use **math_batch** (`calls`: `[{name, arguments}, ...]`, max 64, results in order) when
operations are **independent** — e.g. several `simplify`/`evaluate`/`factor`/`expand` in
one request.

Do **not** batch when a step depends on a previous result (e.g. `describe_data` → choose
plot → `ttest`); keep those sequential, one `math(...)` call per step.

## Workflow Patterns

- **Descriptive:** `describe_data` → `plot_histogram` or `plot_bar`
- **Relationships:** `correlation` / `linear_regression` → `plot_scatter`
- **Time series:** `moving_average` → `plot_timeseries`
- **Testing:** `ttest` → `plot_bar`
- **ODEs:** `solve_ode` → `plot_ode_solution`

## Tools Reference

**Discovery:** `math_ls()` for categories/names; `math_man(name)` or `math_ls(category)`
for parameters; execute with `math(name, arguments)` or `math_batch`.

Chart tools support optional: `title`, `xlabel`, `ylabel`, `figsize` (width, height in px),
`grid`, `xlim`/`ylim`, `output_format` (`'png'`|`'svg'`), and often `xlabel_rotation`,
`legend_loc`, `colors`/`color`.

### algebra

| Tool         | Parameters                        | Use cases                                                                          |
| ------------ | --------------------------------- | ---------------------------------------------------------------------------------- |
| **simplify** | `expression` (string)             | Reduce expressions; verify identities; combine like terms. Fractions e.g. `"6/8"`. |
| **solve**    | `equation` (expr = 0), `variable` | Roots/zeros; solve for an unknown.                                                 |
| **factor**   | `expression`                      | Factor polynomials; simplify rationals.                                            |
| **expand**   | `expression`                      | Multiply out parentheses; distribute.                                              |

### calculus

| Tool           | Parameters               | Use cases                                   |
| -------------- | ------------------------ | ------------------------------------------- |
| **derivative** | `expression`, `variable` | Rates of change; critical points; partials. |
| **integral**   | `expression`, `variable` | Antiderivatives; areas.                     |

### numbers

| Tool             | Parameters                                                | Use cases                                                |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| **evaluate**     | `expression`, `values`? (var → number)                    | Numeric evaluation; substitute; check equality.          |
| **to_fraction**  | `value` (decimal/numeric expr)                            | Decimal → exact rational.                                |
| **convert_unit** | `value`, `from_unit`, `to_unit`                           | Length, mass, time, temperature, volume, speed.          |
| **find_root**    | `function`, `initial_guess`?, `bracket`? [a,b], `method`? | Numerical root when symbolic solve fails; intersections. |

### stats

| Tool                  | Parameters                               | Use cases                                |
| --------------------- | ---------------------------------------- | ---------------------------------------- |
| **describe_data**     | `data` (array)                           | Summary stats incl. percentiles.         |
| **ttest**             | `sample1`, `sample2`?, `alternative`?    | One/two-sample t-test; A/B comparisons.  |
| **correlation**       | `x_data`, `y_data`, `method`?            | Pearson/Spearman/Kendall correlation.    |
| **linear_regression** | `x_data`, `y_data`                       | Slope, intercept, R²; trend forecasting. |
| **moving_average**    | `data`, `window`? (default 7), `method`? | Smooth time series.                      |

### ode

| Tool                  | Parameters                                                                           | Use cases                        |
| --------------------- | ------------------------------------------------------------------------------------ | -------------------------------- |
| **solve_ode**         | `equations` (["dx/dt = expr"]), `initial_conditions`, `time_span` [t0,t1], `method`? | Systems of ODEs; dynamic models. |
| **plot_ode_solution** | `ode_result` (JSON string from solve_ode)                                            | Visualize ODE solutions.         |

### charts

| Tool                 | Parameters                                                                             | Use cases                                     |
| -------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| **plot_timeseries**  | `timestamps`, `series`; opt `secondary_y`, `show_values`, `value_format`, `linestyles` | Data over time; multiple series.              |
| **plot_bar**         | `categories`, `values`; opt `horizontal`, `show_values`, `value_format`                | Categorical comparison; rankings.             |
| **plot_histogram**   | `data`, `bins`? (default 30)                                                           | Distribution shape; outliers.                 |
| **plot_scatter**     | `x_data`, `y_data`; opt `labels`                                                       | Correlation; paired measurements.             |
| **plot_heatmap**     | `data` (2D), `x_labels`?, `y_labels`?; opt `colormap`                                  | Matrices; intensity over 2 dims.              |
| **plot_stacked_bar** | `categories`, `series`; opt `horizontal`, `show_values`, `show_total`, `value_format`  | Part-to-whole by category.                    |
| **plot_stackplot**   | `x_data`, `series`; opt `baseline`, `alpha`                                            | Composition over continuous x.                |
| **plot_pie**         | `labels`, `values`; opt `autopct`, `explode`, `startangle`, `shadow`                   | Proportional composition — prefer `plot_bar`. |

### output

| Tool      | Parameters   | Use cases                       |
| --------- | ------------ | ------------------------------- |
| **latex** | `expression` | Convert an expression to LaTeX. |

## Execution Guidelines

1. **Interpret the word problem** — identify the underlying math question.
2. **Classify** — statistical, linear/regression, or symbolic.
3. **Quick calc?** For one-off results, call `math`/`math_batch` directly.
4. **Dataset?** Create the timestamped analysis folder + DuckDB DB, extract raw data,
   load into DuckDB, and let SQL do aggregation/filtering/joining — never process MCP
   results directly in LLM context. Export clean CSV for Math MCP.
5. **Select and run tools** — `math_ls()` → `math_man(name)`/`math_ls(category)` →
   `math(name, arguments)` (or `math_batch` when independent).
6. **Visualize** — choose the graph type by relationship, apply the design rules, verify
   quality. Over stdio, charts return inline base64.
7. **Persist artifacts** for dataset work — keep the `.duckdb`, raw responses, CSVs, and
   charts in the same timestamped folder.

**Key principles:** correct tool over arithmetic guesswork; one step at a time for
dependent analyses; batch only independent calls; reserve the DuckDB pipeline for real
datasets.
