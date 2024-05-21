// Add event listener to audio elements to update play/pause button
document.addEventListener("DOMContentLoaded", function() {
	const audioElements = document.querySelectorAll("audio");
	audioElements.forEach(function(audio) {
		const button = audio.nextElementSibling;
		audio.addEventListener("play", function() {
			button.innerHTML = "Pause";
			button.classList.add("playing");
		});
		audio.addEventListener("pause", function() {
			button.innerHTML = "Play";
			button.classList.remove("playing");
		});
	});
});