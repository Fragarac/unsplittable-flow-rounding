# Cost-preserving unsplittable rounding with one large demand and equal small demands

This repository contains a proof note for independent review and a companion Node.js checker. The note treats a finite directed graph with one source, nonnegative linear arc costs, one terminal demand of size $D$, and all other terminal demands equal to $d$, where $D\ge d>0$. Its claim is the existence of a cost-nonincreasing unsplittable routing $y$ with $y_e<x_e+D$ on every arc. This includes arbitrary two-terminal demand ratios.

- [Proof note (PDF)](unsplittable_flow_one_large_demand.pdf)
- [Proof note (Markdown)](proof.md)
- [Reproduction script](verify_unsplittable_rounding.cjs)

## Reproduce the checks

Run from the repository directory with Node.js.

```sh
node verify_unsplittable_rounding.cjs
```

The checker uses scaled-integer arithmetic on 30,000 seeded inputs and a minimum-cost counterpart for each. It also enumerates all eight unsplittable routings in Dmitry Rybin's counterexample and reproduces fractional cost 58, minimum cost 60 at allowance 15, and minimum allowance 16 at cost at most 58. [AFP verification of Rybin's counterexample](https://isa-afp.org/entries/Dinitz_Garg_Goemans_Counterexample.html)

The argument was developed and checked step by step in an OpenAI Codex session.
