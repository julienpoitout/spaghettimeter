# What Is Spaghetti Code? Examples, Causes, and How to Fix It

**Spaghetti code** is source code with a tangled, unstructured control flow that makes it difficult to follow, debug, or extend. The name comes from the visual metaphor: trace any single execution path with a finger and it weaves through the codebase like a strand of pasta on a plate — crossing other strands, doubling back, and disappearing into unexpected places.

If you have ever opened a file and felt your stomach drop at endless nested `if` statements, functions that touch a dozen unrelated globals, or a "utility" module that quietly runs your entire application, you have met spaghetti code.

## A quick definition

Spaghetti code has three reliable hallmarks:

1. **No clear structure.** Responsibilities are not separated. Business logic, UI, data access, and side effects sit in the same function.
2. **Hidden dependencies.** Changing one line breaks something seemingly unrelated several files away.
3. **Hard to reason about locally.** You cannot understand a function by reading it — you have to load most of the system into your head first.

It is not about line count, language, or age. A 30-line function can be spaghetti. A 30,000-line codebase can be clean.

## A small example

Here is a deliberately tangled snippet — short, but every smell is real:

```js
let user, cart, total, discount;

function go(x) {
  if (x == 1) {
    user = JSON.parse(localStorage.getItem("u"));
    if (user) { cart = user.cart || []; go(2); }
    else { window.location = "/login"; }
  } else if (x == 2) {
    total = 0;
    for (let i = 0; i < cart.length; i++) total += cart[i].p * cart[i].q;
    if (user.vip) discount = total > 100 ? 0.2 : 0.1;
    else discount = 0;
    go(3);
  } else if (x == 3) {
    document.getElementById("t").innerText = total - total * discount;
  }
}
```

What is wrong here? Almost everything:

- A single function `go()` does authentication, pricing, and rendering.
- State leaks through module-level globals (`user`, `cart`, `total`, `discount`).
- Control flow is driven by a magic number (`x`) rather than named functions.
- The DOM is touched directly in the same place that fetches the user.
- There are no types, no boundaries, and no way to test pricing without a logged-in user and a DOM.

The same logic, untangled:

```js
function getUser() {
  return JSON.parse(localStorage.getItem("u"));
}

function calculateTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function discountFor(user, total) {
  if (!user.vip) return 0;
  return total > 100 ? 0.2 : 0.1;
}

function renderTotal(amount) {
  document.getElementById("t").innerText = amount;
}

function checkout() {
  const user = getUser();
  if (!user) return (window.location = "/login");
  const total = calculateTotal(user.cart ?? []);
  const finalAmount = total * (1 - discountFor(user, total));
  renderTotal(finalAmount);
}
```

Same behavior, but each piece can be read, tested, and changed in isolation.

## What causes spaghetti code?

Spaghetti is rarely written by bad developers. It is almost always the result of pressure meeting time:

- **Deadline-driven copy-paste.** "Just ship it, we'll clean it up later" — and "later" never arrives.
- **Feature accretion.** A function written for one case grows two parameters, then a flag, then a flag for the flag.
- **Fear of refactoring.** Without tests, every change feels risky, so developers add code beside the existing mess instead of fixing it.
- **No clear ownership.** When everyone touches a file and no one owns it, conventions drift.
- **AI-generated code that nobody reviewed.** Generated code is easy to accept and hard to challenge. Patterns that would never survive a human PR slip in unchecked.

## Why it costs more than you think

Spaghetti code is not a stylistic complaint — it has a measurable cost:

- **Bugs cluster.** Tangled modules concentrate defects, which is why static-analysis tools weight complexity so heavily.
- **Onboarding slows.** New developers spend weeks understanding what should take days.
- **Estimates explode.** A "simple" change ripples through hidden dependencies, and your two-day ticket becomes a two-week one.
- **Morale drops.** Engineers leave codebases they dread opening.

## How to fix spaghetti code

You cannot rewrite a tangled codebase in a weekend, and you usually shouldn't try. Refactor in small, reversible steps:

1. **Add tests around the mess first.** Even crude characterization tests give you a safety net. You cannot refactor what you cannot verify.
2. **Extract pure functions.** Pull calculations and transformations out of stateful, side-effecting code. Pure functions are trivially testable.
3. **Name the magic.** Replace numeric flags, string switches, and hidden globals with named functions and explicit parameters.
4. **Separate layers.** UI should not call the database. Business rules should not know about HTTP. Draw the boundary and enforce it.
5. **Delete dead code.** Unreached branches, commented-out blocks, and unused parameters are noise that hides real signal.
6. **Refactor at the edges of features.** Whenever you touch a tangled file for a new feature or bug, leave it slightly cleaner than you found it. Compound interest does the rest.

## How to avoid writing it in the first place

- **Keep functions small and named for what they do**, not for when they are called.
- **Prefer pure functions** for anything that does not need to touch the outside world.
- **Review your own diffs** before opening a PR. If you cannot explain a hunk in one sentence, it is too tangled.
- **Run a linter and a complexity check** in CI. Cyclomatic complexity over ~10 per function is a reliable smell.
- **Treat AI-generated code like a junior PR.** Read it, challenge it, refactor it before merging.

## Measure your spaghetti score

If you are wondering how tangled your own repository is, you do not have to guess. [SpaghettiMeter](/) scans any public GitHub repo with AI and returns a 0–10 spaghetti score, plus a breakdown of the worst offenders and concrete refactoring suggestions. It is free for the first few scans and takes about a minute.

## TL;DR

Spaghetti code is unstructured, tangled code that is expensive to change and easy to break. It is caused by pressure, not incompetence, and it is fixed by small, disciplined refactors — not by big-bang rewrites. The earlier you measure it, the cheaper it is to untangle.