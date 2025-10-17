---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

Education
======
* **Ph.D. in Computer Science**, Courant Institute of Mathematical Sciences, New York University  
  * Sep 2025 – Present  
  * Advisor: [Prof. Shengjie Wang](https://sheng-jie-wang.github.io/)

* **B.S. in Computer Science**, Minor in Mathematics, New York University Shanghai & New York  
  * Aug 2021 – May 2025  

---

Research Interests
======
* **Efficient AI**, **Generative Models**, with a focus on **model architectural design** and **algorithmic acceleration**.

---

Selected Publications
======
<ul>
{% for post in site.publications reversed %}
  {% include archive-single-cv.html %}
{% endfor %}
</ul>

---

Projects
======
{% comment %} Research & Engineering Projects {% endcomment %}

## **ToMA: Token Merge with Attention for Diffusion Models**  
*Co-First Author, ICML 2025 Poster — Sep 2023 – May 2024*  
- Proposed **ToMA**, a GPU-aligned token merging framework that reformulates merging as an attention-like linear transformation with invertible unmerge, enabling efficient diffusion model acceleration **without quality degradation**.  
- Applied **submodular optimization** for representative token selection with theoretical guarantees, replacing discrete selection with matrix operations to improve both **efficiency** and **generation fidelity**.  
- Co-designed **GPU-efficient merging/unmerging** via attention-like matrix operations and exploited spatial locality + temporal redundancy to reduce FLOPs and latency on both Unet and DiT architectures.

---

## **Hilbert Attention for Image Generation with Diffusion Models**  
*First Author, under review at ICLR 2026 — May 2025 – Sep 2025*  
- Proposed **HilbertA**, a sparse attention mechanism based on the Hilbert curve to preserve 2D spatial locality and enable contiguous memory access.  
- Designed **Hilbert-curve sparse attention** with reordering, tiling, and sliding strategies to balance **local modeling** and **global information flow**, while maintaining coalesced GPU memory access.  
- Developed **custom Triton fused kernels** and integrated LoRA fine-tuning to maximize sparsity efficiency, achieving up to **4.17× speedup** on Flux.1 with comparable generation quality.

---

## **Efficient Long-Context LLM KV Recomputation via Small Model Guidance**  
*First Author, under review at ACL 2026 — Jun 2025 – Present*  
- Proposed **Speculative-Recompute**, a method to alleviate the prefill bottleneck in long-context LLMs by leveraging a smaller sibling model to predict critical tokens for selective KV recomputation.  
- Introduced a **hybrid guidance strategy** combining token-mixing consistency across model scales and token-level entropy to estimate token importance.  
- Achieved up to **9.4× TTFT speedup** on Qwen3 0.6B–8B models at the same recomputation ratio with +8% accuracy on Longbench.

---

## **Context Selection for In-Context Learning**  
*First Author, under review at ACL 2026 (Short Paper Track) — Jan 2024 – May 2024*  
- Proposed **Sub-CP**, a submodular, block-aware context selection framework that controls a diversity–coherence spectrum for scalable ICL.  
- Designed four partition strategies (Global Diverse / Global-Local Diverse / Local Diverse / Local Coherent) to balance global coverage and local structure.  
- Integrated Sub-CP into DENSE, ICAE, and CEPE pipelines, achieving consistent improvements across TREC, SST-2/5, MR, and AG News benchmarks.


Industry Experience
======
* **Machine Learning Engineer Intern**, Tencent Technology, Shanghai, China  
  * *May 2024 – Aug 2024*  
  * Built a 1M+ synthetic face dataset using SDXL + ControlNet + LoRA with task-specific prompts, accelerated generation by 40% via distributed multi-node pipelines, and contributed to fine-tuning a 1B-parameter multimodal anti-spoofing model on 8×H100 GPUs, achieving 97% accuracy against diverse attacks.

* **Machine Learning Engineer Intern**, SenseTime Technology, Shanghai, China  
  * *May 2023 – Aug 2023*  
  * Designed an 8M-sample dataset for Haitong Securities chatbot using advanced text augmentation (DeBERTaV3, regex cleaning, RoBERTa/Sentence-BERT), improving accuracy by 7%.

---

Skills
======
* **Programming**: Python, PyTorch, CUDA, Triton, C++  
* **Machine Learning**: Diffusion models, Transformer architectures, LoRA fine-tuning, dataset construction  
* **Tools**: Git, Jekyll, LaTeX, Linux, Distributed training pipelines

---

Service and Leadership
======
* Co-first author of ICML 2025 Poster paper *ToMA: Token Merge with Attention for Diffusion Models*  

