let skewSetter = gsap.quickTo("img", "skewY"), // fast
	  clamp = gsap.utils.clamp(-20, 20); // don't let the skew go beyond 20 degrees.

ScrollSmoother.create({
	wrapper: "#wrapper",
	content: "#content",
	smooth: 6,
  speed: 2,
	effects: true,
	onUpdate: self => skewSetter(clamp(self.getVelocity() / -50)),
	onStop: () => skewSetter(0)
});
window.onbeforeunload = function() {
	setTimeout(function() {
	  window.location.href = 'index.html';
	}, 5000); // 5000 milliseconds = 5 seconds
  };