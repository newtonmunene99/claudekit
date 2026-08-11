# Vue 3 Style Guide Summary

This document summarizes key rules and best practices for Vue 3 applications using the Composition API and `<script setup lang="ts">`.

## 1. Architecture
- **Default stack:** Vue 3 + Composition API + `<script setup lang="ts">`.
- **Component map:** For non-trivial features, plan component boundaries before coding — one responsibility per component, explicit props/emits contracts.
- **Feature layout:** Prefer `components/<feature>/...` and `composables/use<Feature>.ts` when adding more than one component.
- **Route views:** Keep entry/root and route-level views thin — composition surfaces only (shell, providers, feature wiring).

## 2. Reactivity
- **Single source of truth:** Keep source state minimal (`ref`/`reactive`); derive everything possible with `computed`.
- **Watchers:** Use for side effects only, not for derived state.
- **Templates:** Keep templates declarative; move branching and expensive logic to script/computed.
- **Avoid:** Recomputing filtered/sorted data or class/style logic in templates.

## 3. Single-File Components (SFC)
- **Section order:** `<script>` → `<template>` → `<style>`.
- **Colocation:** Keep template, script, and styles in one `.vue` file per component.
- **Naming:** PascalCase for component filenames and in templates.
- **Styles:** Prefer `scoped` styles; use class selectors over element selectors in scoped CSS.
- **Template safety:** Never use `v-html` with untrusted content; always provide stable `:key` in `v-for`.
- **Conditionals:** Choose `v-if` vs `v-show` based on toggle frequency and initial render cost.

## 4. Component Boundaries
Split a component when **any** of these is true:
- It owns both orchestration/state and substantial markup for multiple sections.
- It has 3+ distinct UI sections (form, filters, list, footer/status).
- A template block is repeated or could become reusable.

For CRUD/list features, split at least into: container, input/form, list (or item), and footer/actions or filter/status.

Move UI sections into child components (props in, events out). Move reusable or side-effect-heavy logic into composables (`useXxx()`).

## 5. Data Flow
- **Primary model:** Props down, events up.
- **Contracts:** Use typed `defineProps` and `defineEmits`; prefer `defineModel` for true two-way bindings (Vue 3.4+).
- **Props:** Treat as read-only; never mutate props in the child.
- **Provide/inject:** Only for deep-tree dependencies or shared context; use `InjectionKey` in TypeScript projects.

## 6. Composables
- Extract logic when it is reused, stateful, or side-effect heavy.
- Keep composable APIs small, typed, and predictable.
- Separate feature logic from presentational components.

## 7. Optional Features (require explicit need)
Do not add by default: slots, fallthrough attrs, `<KeepAlive>`, `<Teleport>`, `<Suspense>`, transitions, directives, async components, render functions, plugins, or global state management.

## 8. Performance
Optimize **after** behavior is correct:
- Virtualize large lists.
- Use `v-once` / `v-memo` for static subtrees that re-render unnecessarily.
- Avoid unnecessary component abstraction in hot list paths.

*Sources: [Vue.js Guide](https://vuejs.org/guide/), vue-best-practices skill*
