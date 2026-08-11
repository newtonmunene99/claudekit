# Go Style Guide Summary

This document summarizes idiomatic Go style from the [Google Go Style Guide](https://google.github.io/styleguide/go) and [Effective Go](https://go.dev/doc/effective_go), plus performance practices from [goperf.dev](https://goperf.dev).

## 1. Style Principles (in priority order)
1. **Clarity:** Purpose and rationale are clear to the reader.
2. **Simplicity:** Accomplish the goal in the simplest way.
3. **Concision:** High signal-to-noise ratio.
4. **Maintainability:** Easy to change and extend.
5. **Consistency:** Align with the broader codebase.

Write for the reader, not the author. Prefer descriptive names, helpful commentary, and modular functions over clever one-liners.

## 2. Formatting & Naming
- **`gofmt` / `go fmt`:** All Go code must be formatted — non-negotiable.
- **`MixedCaps`:** Use `MixedCaps` or `mixedCaps` for multi-word names. Do not use underscores.
- **Exported vs. unexported:** Uppercase first letter = exported; lowercase = package-private.
- **Package names:** Short, concise, single-word, lowercase.
- **Getters:** No `Get` prefix — field `owner` → method `Owner()`.
- **Interfaces:** One-method interfaces named by method + `-er` suffix (e.g. `Reader`, `Writer`).
- **Avoid repetition:** Omit redundant package/type names from function and method names at call sites.

## 3. Control Structures & Functions
- **`if`:** No parentheses around conditions; braces mandatory; initialization statements encouraged (`if err := f(); err != nil`).
- **`for`:** Go's only loop; use `for...range` for slices, maps, strings, channels.
- **`switch`:** Cases do not fall through by default; can replace `if-else-if` chains.
- **Multiple returns:** Standard pattern for `(value, err)` pairs.
- **`defer`:** Use for cleanup (close files, unlock mutexes) immediately before return.
- **Block scopes (`{...}`):** Use extra braces to scope or group related code within a function. This limits variable lifetime, keeps names from leaking into unrelated logic, and makes long functions easier to scan. Group setup/teardown, validation, I/O, or other logical steps in their own blocks; prefer this over one flat sequence of declarations when a section has a clear boundary.

## 4. Data & Types
- **`new` vs. `make`:** `new(T)` returns `*T` (zeroed); `make` initializes slices, maps, channels only.
- **Slices:** Preferred over arrays for sequences.
- **Maps:** Use comma-ok idiom: `value, ok := myMap[key]`.
- **Interfaces:** Implicit implementation; prefer many small interfaces over one large interface.

## 5. Concurrency & Errors
- **Concurrency:** Share memory by communicating — goroutines and channels over shared mutable state.
- **`error` type:** Check errors explicitly; do not discard with `_` unless intentional.
- **`panic`:** Reserved for truly unrecoverable situations; libraries should return errors, not panic.

## 6. Alis Build Libraries

Prefer these shared libraries over ad-hoc alternatives on Alis Build Go services:

- **[`go.alis.build/alog`](https://pkg.go.dev/go.alis.build/alog)** — structured logging. Use for all application logging instead of `log`/`fmt`. Writes Google Cloud Logging–compatible JSON on Cloud Run/GKE (local ANSI output in dev). Call level helpers with `context.Context` (`Info`, `Warn`, `Error`, `Debug`, etc.). Attach trace, labels, HTTP request metadata, and custom fields via context helpers (`WithCloudTraceContext`, `WithLogLabels`, `WithLogFields`). Integrates with `slog` via `NewSlogLogger`.
- **[`go.alis.build/client/v2`](https://pkg.go.dev/go.alis.build/client/v2)** — gRPC client connections to Cloud Run services. Use `NewConn` instead of hand-rolling dial options and IAM token injection. Handles TLS, Cloud Run ID token auth (cached/refreshed), and optional retries (`WithRetry`) for transient `Unavailable` errors. Use `insecure: true` for local testing; use `WithoutAuth()` when supplying your own `Authorization` header.
- **[`go.alis.build/utils`](https://pkg.go.dev/go.alis.build/utils)** — shared utilities before writing one-off helpers. Core package: slice helpers (`Chunk`, `Filter`, `Find`, `GroupBy`, `Reduce`, `Transform`, `Unique`, `Contains`). Subpackages: `maps`, `sets`, `retry` (exponential backoff with jitter), `protobufutils`, `strings` (naming conversions), `env`.
- **[`go.alis.build/atom`](https://pkg.go.dev/go.alis.build/atom)** — transaction/unit-of-work for non-DB side effects (API calls, file I/O). Group operations with `Do(operation, compensate)`; failed steps trigger LIFO rollback via compensating functions. Use `defer` rollback when not committed; support savepoints, hooks, per-operation timeouts, and compensation retry. Not for distributed transactions across services.
- **[`go.alis.build/validation`](https://pkg.go.dev/go.alis.build/validation)** — request validation for gRPC/protobuf handlers. Use `NewValidator()` and chain fluent rules on request fields (`String`, `Int32`, `Enum`, `Timestamp`, lists, etc.). Support conditional rules (`If`/`Then`), logical `Or`, and `Custom`/`CustomEvaluated`. Call `Validate()` and return `codes.InvalidArgument` with the error message.

## 7. Performance (measure first)
1. **Establish a baseline** — benchmarks and pprof (CPU, memory) before optimizing.
2. **Identify the bottleneck** — allocations/GC, I/O, scheduler, or networking.
3. **Apply targeted patterns** — only after data shows where time is spent.

Quick cues:
- **HTTP connection reuse:** Drain response bodies before closing (`io.Copy(io.Discard, resp.Body)` then `Close()`); otherwise connections are not reused.
- **Escape analysis:** `go build -gcflags="-m" ./path/to/pkg` to see heap escapes; reduce escapes on hot paths.
- **Avoid premature optimization:** Do not suggest pooling, preallocation, or `GOGC` changes without benchmark or pprof evidence.

*Sources: [Google Go Style Guide](https://google.github.io/styleguide/go), [Effective Go](https://go.dev/doc/effective_go), [goperf.dev](https://goperf.dev), [Alis Build Go packages](https://pkg.go.dev/go.alis.build)*
