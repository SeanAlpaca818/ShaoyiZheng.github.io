---
title: "ToMA: Token Merge with Attention for Diffusion Models"
collection: publications
category: conferences
permalink: /publication/2025-07-01-toma-token-merge-with-attention-for-diffusion-models
excerpt: 'ToMA is a GPU‑aligned token merging framework for diffusion models, reformulating token merging as an attention‑like linear transformation with invertible unmerge to accelerate diffusion models without degrading quality, using submodular token selection and GPU‑efficient operations.'
date: 2025-07-01
venue: 'ICML 2025, PMLR 267:40930–40951'
citation: 'Lu, W.*, Zheng, S.*, Xia, Y., &amp; Wang, S. (2025). &quot;ToMA: Token Merge with Attention for Diffusion Models.&quot; <i>ICML 2025</i>, PMLR 267:40930–40951.'
---
Proposed ToMA, a GPU-aligned token merging framework that reformulates merging as an attention-like linear transformation with invertible unmerge, enabling practical acceleration of diffusion models without quality degradation. Applied submodular optimization to select representative tokens, providing theoretical guarantees on information coverage and improving efficiency and generation fidelity. Co-designed GPU-efficient merging/unmerging using pure attention-like matrix operations to minimize overhead, leveraging spatial locality and temporal redundancy across layers and timesteps. Achieved notable acceleration on both Unet and DiT architectures: up to 1.3× speedup on Flux and 1.4× on SDXL without quality degradation measured by FID, CLIP, and DINO scores.

Recommended citation: Lu, W.*, Zheng, S.*, Xia, Y., & Wang, S. (2025). "ToMA: Token Merge with Attention for Diffusion Models." ICML 2025, PMLR 267:40930–40951.
