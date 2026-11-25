# Cost-preserving unsplittable rounding with one large demand and equal small demands

Dinitz, Garg, and Goemans [1] give an additive congestion bound of the largest demand $D$ for single-source unsplittable rounding. For one large demand and equal small demands $d$, Nikolenko obtains $|y_e-x_e|<D$ and cost preservation for arbitrary nonnegative arc costs in common-point interval systems [2, Observation 3.2, Theorem 7.2, and Proposition 7.3]. These networks have a directed spine with two private exit arcs per terminal and exactly two simple paths from the source to each terminal. The spine intervals between the exit points all share an arc [2, Definition 3.3].

His exact-mean result on acyclic graphs allows arbitrary multiplicities of two demand values $D>d$ and expresses $x$ as a convex combination of routings with $|y_e-x_e|\le D+d$ [3, Corollary 4.4]. With nonnegative costs, removing directed cycles gives the cost-preserving $D+d$ upper bound on general directed graphs.

For one large demand and equal small demands on general directed graphs, the claim below is limited to a single cost-preserving routing and a strict upper bound $y_e<x_e+D$ on every arc. This includes the arbitrary two-terminal case listed as open in Santibáñez-Leal's November report [4].

The result is compatible with the $(15, 10, 15)$ instance that Dmitry Rybin announced on 22 July 2026 and that was independently verified by Santibáñez-Leal [4] and formalized in the AFP [5]. Designating either demand of $15$ as the large one leaves unequal demands of $10$ and $15$. The two-terminal result, together with Rybin's instance, would make three the minimum number of terminals in a counterexample.

## Claim

Let a finite directed graph have one source $s$ and nonnegative linear arc costs $c\ge0$. One designated terminal $t$ has demand $D$, and all other terminals have demand $d$, with $D\ge d>0$. For every feasible splittable flow $x$ there is an unsplittable flow $y$ meeting the same demands with

$$
c^\top y\le c^\top x,\qquad y_e < x_e+D \quad\text{for every arc } e.
$$

For integer $r=D/d$, the non-strict cost-preserving bound follows by removing directed cycles and applying Morell and Skutella's theorem for acyclic digraphs [6, Theorem 4]. The proof below applies to every $r\ge1$ and gives the strict bound.

## Proof

We may assume that the terminals are pairwise distinct and distinct from $s$. If needed, attach a new leaf for each demand via a zero-cost arc from its original location. Extend $x$ by placing that demand on the new arc. Deleting the added arcs from the resulting paths recovers a solution on the original graph.

**Normalize and minimize cost.** Divide demands and flows by $d$. Each small demand is now $1$ and the large demand is $r=D/d$. Write $k=\lfloor r\rfloor$ and $\delta=r-k$. Let $f$ minimize cost for these demands subject to arc bounds $[0,u_e]$, where $u_e=\lceil x_e\rceil$ uses the normalized $x$. Since $x$ is feasible, $c^\top f\le c^\top x$.

**Round the large demand down.** Fix arcs with $f_e=0$ or $f_e=u_e$ to those values. Give every remaining arc bounds $[0,u_e]$. Add an auxiliary vertex $q$ and an arc from each terminal to $q$. Give each small terminal arc bounds $[1,1]$ and give $t\to q$ bounds $[k,k+1]$. If there are $n$ small terminals, add $q\to s$ with bounds $[0,n+k+1]$. Extend $f$ by sending each demand to $q$ and their sum back to $s$. This is a feasible circulation with flow $r$ on $t\to q$. All bounds are integers, so minimizing the flow on $t\to q$ has an integral optimal vertex. Its value is an integer in $[k,r]$ and hence equals $k$. Restricting that vertex to the arcs before adding $q$ yields an integral flow $z$ that serves each small demand, serves $k$ units at $t$, and preserves all fixed arcs.

**Bound the cost of merging.** Decompose $z$ into simple source-to-terminal paths with positive integer multiplicities and directed cycles. Let $P$ be a cheapest path among those carrying flow destined for $t$, let $\chi_P$ be its arc-incidence vector, and write $L=c^\top\chi_P$ for its unit cost. For sufficiently small $\varepsilon>0$ the flow

$$
w=f+\varepsilon(f-z-\delta\chi_P)
$$

is feasible for the minimum-cost flow problem defining $f$. The direction has zero net balance because $f-z$ and $\delta\chi_P$ have identical balances. On arcs with $f_e=0$, both $z_e$ and $(\chi_P)_e$ vanish. On arcs with $f_e=u_e$, the direction can only decrease the load. Every other arc has slack in both directions. Optimality of $f$ therefore gives $c^\top f-c^\top z\ge\delta L$.

**Merge and bound arc loads.** Discard the cycles, keep each small terminal's unit path, and replace the paths to $t$ by $r$ units along $P$. Removing cycles costs nothing or saves cost, and the old paths to $t$ cost at least $kL$ in total. The resulting flow $y$ therefore satisfies $c^\top y\le c^\top z+\delta L\le c^\top f\le c^\top x$. Each arc of the simple path $P$ carried at least one of the $k$ units destined for $t$ in $z$. Its load increases by at most $r-1$ relative to $z$, and all other loads can only decrease. Thus on every arc,

$$
y_e\le \lceil x_e\rceil+r-1 < x_e+r.
$$

Scaling back by $d$ proves the claim.

## Running time

For rational inputs encoded in binary, the construction runs in polynomial time. It uses two network flow linear programs and one flow decomposition that stores each path with its multiplicity.

## Computational checks

The argument was developed and checked step by step in an OpenAI Codex session. The companion Node.js script obtains $z$ by cycle rounding on fractional arcs, preserving the fixed arc values and rounded terminal demands in the proof. A separate bounded-flow solve cross-checks feasibility on that face.

The script uses exact scaled-integer arithmetic on 30,000 seeded rational inputs and a minimum-cost counterpart for each. Of these pairs, 25,912 have a noninteger demand ratio. For each counterpart it recomputes the ceiling capacities from $x$ and checks $c^\top f=c^\top x$. It checks $c^\top y\le c^\top f\le c^\top x$ and the strict arc bounds on both sets. It also enumerates all eight routings of Rybin's instance and reproduces fractional cost $58$ and a minimum unsplittable cost of $60$ with additive allowance $15$.

Run `node verify_unsplittable_rounding.cjs`.

## References

**[1]** Y. Dinitz, N. Garg, and M. X. Goemans. *On the Single-Source Unsplittable Flow Problem*. Combinatorica 19 (1999), 17-41. [10.1007/s004930050043](https://doi.org/10.1007/s004930050043)

**[2]** S. Nikolenko. *Deletion-Star Ceilings and a 1.28249... Lower Bound for Cost-Preserving Single-Source Unsplittable Flows*. Zenodo preprint, 31 July 2026. [10.5281/zenodo.21716713](https://doi.org/10.5281/zenodo.21716713)

**[3]** S. Nikolenko. *Exact-Mean Decompositions for Cost-Preserving Single-Source Unsplittable Flows: Demand Scales and Local Interaction Structure*. Zenodo preprint, 13 August 2026. [10.5281/zenodo.21922203](https://doi.org/10.5281/zenodo.21922203)

**[4]** F. Santibáñez-Leal. *Independent exact verification of the counterexample to Goemans' unsplittable-flow cost conjecture and of the 2026 lower-bound instances, with certified planarity and optimal pricing*. Zenodo preprint, v0.04, 19 November 2026. [10.5281/zenodo.24384160](https://zenodo.org/records/24384160)

**[5]** A. Freitas Ramos, D. Barros Hulak, and R. J. G. B. de Queiroz. *A Formal Counterexample to the Cost-Preserving Single-Source Unsplittable Flow Conjecture*. Archive of Formal Proofs, 2026. [AFP entry](https://isa-afp.org/entries/Dinitz_Garg_Goemans_Counterexample.html)

**[6]** S. Morell and M. Skutella. *Single source unsplittable flows with arc-wise lower and upper bounds*. Mathematical Programming 192 (2022), 477-496. [10.1007/s10107-021-01704-4](https://doi.org/10.1007/s10107-021-01704-4)
