/* Progressive enhancement for the enquiry form.
   Without this file the form still works: it posts normally and the Worker
   redirects to /order/thanks/. With it, the answer arrives in place. */
(function () {
  var form = document.getElementById("order-form");
  var status = document.getElementById("order-status");
  var button = document.getElementById("order-submit");
  if (!form || !status || !button) return;

  // Deep link from a piece page: /order/?piece=kaze
  var wanted = new URLSearchParams(window.location.search).get("piece");
  if (wanted) {
    var select = form.elements.piece;
    if (select && Array.prototype.some.call(select.options, function (o) { return o.value === wanted; })) {
      select.value = wanted;
    }
  }

  function show(message, isError) {
    status.textContent = message;
    status.hidden = false;
    status.style.borderLeftColor = isError ? "var(--border-strong)" : "var(--signal-500)";
  }

  form.addEventListener("submit", function (event) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    event.preventDefault();
    button.disabled = true;
    button.textContent = "Sending";

    fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, body: body };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.body && result.body.error);
        form.hidden = true;
        show(
          "Enquiry received. It is recorded and I have been notified — you will get a reply within 2 to 3 days.",
          false
        );
      })
      .catch(function (error) {
        button.disabled = false;
        button.textContent = "Send enquiry";
        show(
          (error && error.message ? error.message : "Something went wrong sending that.") +
            " Nothing was recorded — try again, or email me directly.",
          true
        );
      });
  });
})();
