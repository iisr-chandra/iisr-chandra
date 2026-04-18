document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar");
  const stickyBar = document.getElementById("stickyBar");
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileBackdrop = document.getElementById("mobileBackdrop");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compactViewport = window.matchMedia("(max-width: 900px)");

  const setMenuState = (isOpen) => {
    if (!hamburger || !mobileMenu || !mobileBackdrop) {
      return;
    }

    hamburger.classList.toggle("is-open", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
    mobileMenu.classList.toggle("open", isOpen);
    mobileBackdrop.classList.toggle("open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
  };

  if (hamburger && mobileMenu && mobileBackdrop) {
    hamburger.addEventListener("click", () => {
      setMenuState(!mobileMenu.classList.contains("open"));
    });

    mobileBackdrop.addEventListener("click", () => {
      setMenuState(false);
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        setMenuState(false);
      });
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuState(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) {
        setMenuState(false);
      }
    });
  }

  const updateChrome = () => {
    const stickyThreshold = Math.min(window.innerHeight * 0.55, 440);
    const showSticky = compactViewport.matches && window.scrollY > stickyThreshold;
    const stickyPadding = stickyBar ? `${stickyBar.offsetHeight + 24}px` : "0px";

    if (stickyBar) {
      stickyBar.classList.toggle("show", showSticky);
    }

    document.body.style.paddingBottom = showSticky ? stickyPadding : "0px";
  };

  updateChrome();
  window.addEventListener("scroll", updateChrome, { passive: true });
  window.addEventListener("resize", updateChrome);

  const createAutoScrollSlider = (trackSelector, itemSelector, intervalMs) => {
    const track = document.querySelector(trackSelector);
    const items = track ? Array.from(track.querySelectorAll(itemSelector)) : [];

    if (!track || items.length < 2) {
      return {
        start: () => {},
        stop: () => {}
      };
    }

    let current = Math.max(
      items.findIndex((item) => item.classList.contains("active")),
      0
    );
    let intervalId = null;
    let resumeTimeout = null;
    let scrollFrame = null;

    const updateActive = (index) => {
      current = (index + items.length) % items.length;
      items.forEach((item, itemIndex) => {
        item.classList.toggle("active", itemIndex === current);
      });
    };

    const scrollToIndex = (index, behavior = "smooth") => {
      updateActive(index);
      track.scrollTo({
        left: items[current].offsetLeft,
        behavior: prefersReducedMotion ? "auto" : behavior
      });
    };

    const stop = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }

      if (resumeTimeout) {
        window.clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }
    };

    const start = () => {
      if (prefersReducedMotion) {
        return;
      }

      stop();
      intervalId = window.setInterval(() => {
        scrollToIndex(current + 1);
      }, intervalMs);
    };

    const syncToScrollPosition = () => {
      const trackCenter = track.scrollLeft + track.clientWidth / 2;
      let closestIndex = current;
      let closestDistance = Number.POSITIVE_INFINITY;

      items.forEach((item, itemIndex) => {
        const itemCenter = item.offsetLeft + item.offsetWidth / 2;
        const distance = Math.abs(itemCenter - trackCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = itemIndex;
        }
      });

      updateActive(closestIndex);
    };

    const scheduleRestart = () => {
      if (prefersReducedMotion) {
        return;
      }

      stop();
      resumeTimeout = window.setTimeout(() => {
        start();
      }, 2600);
    };

    track.addEventListener("scroll", () => {
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }

      scrollFrame = window.requestAnimationFrame(syncToScrollPosition);
    });

    track.addEventListener("pointerdown", stop);
    track.addEventListener("pointerup", scheduleRestart);
    track.addEventListener("pointercancel", scheduleRestart);
    track.addEventListener("mouseenter", stop);
    track.addEventListener("mouseleave", scheduleRestart);
    track.addEventListener("touchstart", stop, { passive: true });
    track.addEventListener("touchend", scheduleRestart, { passive: true });

    window.addEventListener("resize", () => {
      scrollToIndex(current, "auto");
    });

    scrollToIndex(current, "auto");

    return { start, stop };
  };

  const nurseryShow = createAutoScrollSlider("#nsTrack", ".ns-slide", 3600);

  nurseryShow.start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      nurseryShow.stop();
      return;
    }

    nurseryShow.start();
  });

  const revealEls = document.querySelectorAll(".reveal");

  if (prefersReducedMotion) {
    revealEls.forEach((el) => el.classList.add("visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const siblings = Array.from(entry.target.parentElement?.children || []);
          const delay = Math.min(Math.max(siblings.indexOf(entry.target), 0) * 80, 360);

          window.setTimeout(() => {
            entry.target.classList.add("visible");
          }, delay);

          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }

  const formatCounterValue = (value, target, suffix, shortform, isFinal = false) => {
    if (target >= 1000) {
      if (isFinal && shortform) {
        return shortform;
      }

      return `${Math.max(1, Math.round(value / 1000))}K${suffix}`;
    }

    return `${Math.round(value)}${suffix}`;
  };

  const animateCounter = (el) => {
    const target = Number(el.dataset.target || 0);
    const suffix = el.dataset.suffix || "";
    const shortform = el.dataset.shortform || "";

    if (prefersReducedMotion) {
      el.textContent = formatCounterValue(target, target, suffix, shortform, true);
      return;
    }

    const duration = 1800;
    const startedAt = performance.now();

    const tick = (currentTime) => {
      const progress = Math.min((currentTime - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = target * eased;

      el.textContent = formatCounterValue(currentValue, target, suffix, shortform, progress === 1);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  const statNumbers = document.querySelectorAll(".stat-number, .trust-num[data-target]");
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  statNumbers.forEach((el) => counterObserver.observe(el));

  const track = document.getElementById("galleryTrack");
  const prevBtn = document.getElementById("galleryPrev");
  const nextBtn = document.getElementById("galleryNext");

  if (track && prevBtn && nextBtn) {
    const getScrollAmount = () => Math.max(track.clientWidth * 0.82, 280);

    prevBtn.addEventListener("click", () => {
      track.scrollBy({
        left: -getScrollAmount(),
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });

    nextBtn.addEventListener("click", () => {
      track.scrollBy({
        left: getScrollAmount(),
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });

    let pointerDown = false;
    let startX = 0;
    let startScroll = 0;

    const stopDragging = () => {
      pointerDown = false;
      track.classList.remove("is-dragging");
    };

    track.addEventListener("pointerdown", (event) => {
      pointerDown = true;
      startX = event.clientX;
      startScroll = track.scrollLeft;
      track.classList.add("is-dragging");
      track.setPointerCapture?.(event.pointerId);
    });

    track.addEventListener("pointermove", (event) => {
      if (!pointerDown) {
        return;
      }

      track.scrollLeft = startScroll - (event.clientX - startX);
    });

    track.addEventListener("pointerup", stopDragging);
    track.addEventListener("pointercancel", stopDragging);
    track.addEventListener("pointerleave", stopDragging);
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") {
        return;
      }

      const target = document.querySelector(href);

      if (!target) {
        return;
      }

      event.preventDefault();
      setMenuState(false);

      const offset = window.innerWidth <= 820 ? 20 : 28;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });
  });
});
