Widgets["google-calendar"] = {
  async render(container) {
    const CALENDAR_ID = "halvard.g.haga@gmail.com";
    const TIMEZONE = "Europe/Oslo";

    // Google's default embed is the month grid, which is cramped in the 360px
    // widget column. Set this to "AGENDA" for the upcoming-events list, or
    // "WEEK"/"MONTH" to force one of the grid views.
    const MODE = "";

    const HEIGHT = 600;

    const params = new URLSearchParams({
      src: CALENDAR_ID,
      ctz: TIMEZONE,
    });
    if (MODE) params.set("mode", MODE);

    const wrapper = document.createElement("div");

    const title = document.createElement("div");
    title.textContent = "Calendar";
    title.style.fontSize = "0.75rem";
    title.style.opacity = "0.6";
    title.style.marginBottom = "0.5rem";
    title.style.textTransform = "uppercase";
    title.style.letterSpacing = "0.05em";
    wrapper.appendChild(title);

    const frame = document.createElement("iframe");
    frame.src = `https://calendar.google.com/calendar/embed?${params}`;
    frame.title = "Google Calendar";
    frame.loading = "lazy";
    frame.scrolling = "no";
    frame.style.width = "100%";
    frame.style.height = `${HEIGHT}px`;
    frame.style.border = "0";
    frame.style.borderRadius = "8px";
    frame.style.display = "block";
    wrapper.appendChild(frame);

    container.innerHTML = "";
    container.appendChild(wrapper);
  },
};
