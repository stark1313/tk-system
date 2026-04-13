document.querySelectorAll('.sidebar-category[data-toggle]').forEach(function(el) {
  el.addEventListener('click', function() {
    this.classList.toggle('collapsed');
  });
});