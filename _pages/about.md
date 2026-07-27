---
layout: home
permalink: /
title: "Welcome to Shaoyi(Sean) Zheng's Homepage"
author_profile: false
redirect_from:
  - /about/
  - /about.html
keywords: "Shaoyi Zheng, Sean Zheng, NYU, Computer Science, PhD, Efficient AI, Generative Models, Diffusion Models, Machine Learning, Deep Learning, Model Acceleration, NYU Courant, Shengjie Wang"
---

Hi, I’m **Shaoyi Zheng**, currently a Ph.D. student in Computer Science at the Courant Institute of Mathematical Sciences, New York University, where I am advised by [Prof. Shengjie Wang](https://sheng-jie-wang.github.io/). I completed my undergraduate studies at NYU Shanghai, majoring in Computer Science with a minor in Mathematics.  

## Research Interests

**World Model & Robotic Learning** — Using video world models as a substitute source of experience, so robot policies can scale on generated interaction rather than teleoperation hours. The catch is latency: a world model worth rolling out is far too slow to close a control loop, so the other half of this is making it fast enough to act on.

**Robotic Agentic System** — Hierarchical rather than monolithic: a deliberative layer that plans over long horizons, and a reactive action model that runs at control rate. I am interested in how cleanly the two decouple — what the planner hands down, and how they stay consistent when plan and reality disagree.

**Efficiency Foundation Model** — Making large generative models fast without giving up quality: sparse and hardware-aligned attention, token merging, and selective KV-cache recomputation for long contexts. FLOP savings mean little if they fight the hardware, so I care about speedups that hold up on the clock.