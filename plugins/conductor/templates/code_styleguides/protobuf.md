# Protocol Buffers & API Design Style Guide Summary

This document summarizes key rules for designing protocol buffers, RPCs, and messages that follow [resource-oriented design](https://google.aip.dev/121) and [google.aip.dev](https://google.aip.dev/) guidance.

## 1. File Structure
- **Order:** Syntax → package → imports (alphabetical) → options → services → resource messages → request/response messages → enums.
- **Package:** Lowercase, versioned (e.g. `google.library.v1`).
- **Filename:** `snake_case` (e.g. `library_service.proto`).
- **Copyright header:** Only if other protos in the project use one.

## 2. Services & Resources
- **Service name:** Noun, PascalCase (e.g. `Library`).
- **Resource type:** `{ServiceName}/{Type}` (e.g. `library.googleapis.com/Book`).
- **Resource message:** Singular, PascalCase (e.g. `Book`).
- **Resource names:** Path-like without leading slash (`publishers/123/books/abc`); collection segments plural camelCase (`publishers`, `books`); pattern variables snake_case singular (`{publisher}`, `{book}`).

## 3. Standard Methods (prefer before custom)
| Method | RPC name | HTTP | Body |
| ------ | -------- | ---- | ---- |
| Get | `Get{Resource}` | GET | none |
| List | `List{Resources}` | GET | none |
| Create | `Create{Resource}` | POST | resource |
| Update | `Update{Resource}` | PATCH | resource |
| Delete | `Delete{Resource}` | DELETE | none |

- **Request message:** RPC name + `Request` (e.g. `GetBookRequest`).
- **List response:** `List{Resources}Response` with `page_size`, `page_token`, `next_page_token` from day one.
- **Custom RPCs:** Verb + Noun (e.g. `ArchiveBook`); use only when standard methods do not fit.

## 4. Messages & Fields
- **Message names:** Short, PascalCase; no prepositions; omit redundant adjectives.
- **Field names:** `lower_snake_case`; no `is_` prefix on booleans; `_time` suffix for timestamps; `_count` not `num_`.
- **Repeated fields:** Plural (`books`); non-repeated singular (`book`).
- **Booleans:** `disabled` not `is_disabled` (exception: reserved words).
- **Display names:** Human-readable → `display_name`; formal/official → `title`.
- **Field behavior:** Annotate request fields with `REQUIRED`, `OPTIONAL`, or `OUTPUT_ONLY` when using `google.api.field_behavior`.
- **Conflict:** A message must not have a field with the same name as the message.

## 5. Documentation
- **Leading comments** on every service, method, message, field, and enum — never trailing or inline.
- Use CommonMark; third-person present tense.

## 6. Compatibility & Validation
- **No breaking changes** within a major version; adding a packaging annotation is a breaking change.
- Run the [API Linter](https://github.com/googleapis/api-linter); document disabled rules with `aip.dev/not-precedent`.

*Sources: [google.aip.dev](https://google.aip.dev/), protocol-buffers skill*
