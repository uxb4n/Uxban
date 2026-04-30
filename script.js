document.addEventListener("DOMContentLoaded", () => {

  // ── PAGE TRANSITIONS ─────────────────────────────────────
  document.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");
    if (
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !href.startsWith("mailto") &&
      link.target !== "_blank"
    ) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        document.body.classList.add("fade-out");
        setTimeout(() => { window.location.href = href; }, 300);
      });
    }
  });

  // ── MODAL ─────────────────────────────────────────────────
  const modal = document.getElementById("modal");
  if (!modal) return;

  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalYear = document.getElementById("modal-year");

  const sLink = document.getElementById("link-spotify");
  const aLink = document.getElementById("link-apple");
  const yLink = document.getElementById("link-yt");

  document.querySelectorAll(".work-item").forEach(item => {
    item.addEventListener("click", () => {
      modalImg.src = item.querySelector("img").src;
      modalTitle.textContent = item.dataset.title;
      modalYear.textContent = `RELEASED // ${item.dataset.year}`;

      const setLink = (el, url) => {
        if (url && url !== "#") {
          el.href = url;
          el.style.display = "block";
        } else {
          el.href = "#";
          el.style.display = "none";
        }
      };

      setLink(sLink, item.dataset.spotify);
      setLink(aLink, item.dataset.apple);
      setLink(yLink, item.dataset.yt);

      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          modal.classList.add("active");
        });
      });
    });
  });

  const closeModal = () => {
    modal.classList.remove("active");
    setTimeout(() => {
      document.body.style.overflow = "auto";
    }, 350);
  };

  document.querySelector(".modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
});