var audioCtx;

document.addEventListener('DOMContentLoaded', function() {

	// ================== peripheral functions ========================

	function secondsToDisplay(s) {
		var sToUse = Math.round(s)
		const minutes = Math.floor(sToUse / 60);
		const seconds = sToUse % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	function trimString(str, targetLength) {
		// Split the string into words
		const words = str.split(' ');
		// If the string is shorter than len, return it as is
		if (str.length < targetLength) {
			return str;
		}
		// Otherwise, find the last word that fits within the character limit
		let result = '';
		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			if (result.length + word.length > targetLength) {
				break;
			}
			result += word + ' ';
		}
		// Remove trailing whitespace and return the trimmed string
		return result.trim() + "...";
	}

	function scale(x, lowerBound, upperBound) {
		if (x < lowerBound) {
			return 0;
		} else if (x > upperBound) {
			return 1;
		} else {
			return (x - lowerBound) / (upperBound - lowerBound);
		}
	}

	function scaleWithMidpoints(x, lowPoint, midPointLow, midPointHigh, highPoint) {
		// goes from 0 to 1, then stays at 1, then goes to 0.
		if (x <= lowPoint) {
			return 0;
		} else if (x <= midPointLow) {
			return (x - lowPoint) / (midPointLow - lowPoint);
		} else if (x <= midPointHigh) {
			return 1;
		} else if (x <= highPoint) {
			return 1 - (x - midPointHigh) / (highPoint - midPointHigh);
		} else {
			return 0;
		}
	}

	function updateGainsForValue(x, y, allsources, audioCtx, fadeTime, elem, options) {
		
		var radius = elem.canvasSize / 2
		distance = Math.sqrt(Math.pow(x - elem.canvasSize / 2, 2) + Math.pow(y - elem.canvasSize / 2, 2));
		angle = (Math.atan2(y - elem.canvasSize / 2, x - elem.canvasSize / 2));
		var amountForOrig = 1 - scale(distance, elem.canvasSize * 0.075, elem.canvasSize * 0.4)
		var amountForMix = 1 - amountForOrig

		const numboptions = Object.entries(allsources).length
		const targetAngleInterval = (Math.PI * 2) / (numboptions - 1);
		const angleOffset = -1 * (Math.PI / 2)

		var targets = []

		for (var i = 0; i < numboptions - 1; i++) {
			var maxTargetVol = 0
			for (var z = -2; z < 3; z++) {
				var targetAngle = angleOffset + (targetAngleInterval * i)
				var targetWidth = (Math.PI / (numboptions - 3))
				var angleToMeasure = angle + (Math.PI * 2 * z)
				var targetVol = scaleWithMidpoints(angleToMeasure, targetAngle - (targetWidth * .9), targetAngle - (targetWidth * .1), targetAngle + (targetWidth * .1), targetAngle + (targetWidth * .9))
				if (maxTargetVol < targetVol) {
					maxTargetVol = targetVol
				}
			}
			targets.push(maxTargetVol)
		}

		var indexOfMaxTrack = -1
		var idToUse = "1"
		for (const [id, _] of Object.entries(allsources)) {
			if (id == "1") {
				allsources[id].gain.gain.linearRampToValueAtTime(amountForOrig, audioCtx.currentTime + fadeTime)
			} else {
				var indexInTargets = parseInt(id) - 2
				var targetVolume = amountForMix * targets[indexInTargets]
				allsources[id].gain.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + fadeTime)
				if (targetVolume > amountForOrig) {
					if (indexOfMaxTrack == -1) {
						indexOfMaxTrack = indexInTargets
						idToUse = id
					} else if (targetVolume > amountForMix * targets[indexOfMaxTrack]) {
						indexOfMaxTrack = indexInTargets
						idToUse = id
					}
				}
			}
		}

		elem.primaryTrackLabelDiv.innerHTML = trimString(elem.options[idToUse].description, elem.targetLengthOfText)
	}

	function drawBackground(elem) {
		var ctx = elem.canvas.getContext("2d");
		ctx.beginPath();
		ctx.arc(elem.canvas.width / 2, elem.canvas.height / 2, elem.canvasSize / 2, 0, 2 * Math.PI);
		ctx.fillStyle = "white";
		ctx.fill();

		ctx.font = "15px Arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "black";

		var numboptions = Object.entries(elem.options).length

		if (elem.errorMessage != null) {
			ctx.fillText(elem.errorMessage, elem.canvas.width / 2, elem.canvas.height / 2);
			elem.primaryTrackLabelDiv.innerHTML = "<i>error...</i>"
		} else if (elem.isAudioLoading || (!elem.canUseImage)) {
			ctx.fillText("loading...", elem.canvas.width / 2, elem.canvas.height / 2);
			elem.primaryTrackLabelDiv.innerHTML = "<i>loading...</i>"
		} else if (!elem.playing) {
			const imageWidth = elem.canvasSize * .1;
			const imageHeight = imageWidth;
			const x = (elem.canvas.width - imageWidth) / 2;
			const y = (elem.canvas.height - imageHeight) / 2;
			elem.canvas.getContext('2d').drawImage(elem.image, x, y, imageWidth, imageHeight);
			elem.primaryTrackLabelDiv.innerHTML = "<i>press play to begin</i>"
		} else {
			ctx.fillText("original", elem.canvas.width / 2, elem.canvas.height / 2);
		}

		const angle = (Math.PI * 2) / (numboptions - 1);
		const angleOffset = -1 * (Math.PI / 2)
		for (var i = 0; i < numboptions - 1; i++) {
			ctx.fillText("" + (i + 1), (elem.canvas.width / 2) + (elem.canvasSize * 0.42) * Math.cos(angleOffset + (angle * i)), (elem.canvas.height / 2) + (elem.canvasSize * 0.42) * Math.sin(angleOffset + (angle * i)));
		}
	}

	function displayTimeStamp(elem, a, b) {
		if (elem.isSmall) {
			if (b == 0) {
				return secondsToDisplay(0)
			}
			return secondsToDisplay(a % b)
		}
		if (b == 0) {
			return secondsToDisplay(0) + " / " + secondsToDisplay(0)
		}
		return secondsToDisplay(a % b) + " / " + secondsToDisplay(b)
	}

	// ================== beginning of real work to transform div into comparison ========================

	var elems = document.body.getElementsByClassName("audio-comparison");
	for (let elem of elems) {
		console.log("creating an audio-comparison!")
		elem.image = new Image();
		// Set the source of the image to the path of the image file
		elem.image.src = './res/play.png';
		// Add an event listener for when the image has finished loading
		elem.canUseImage = false
		elem.image.addEventListener('load', () => {
			elem.canUseImage = true
			if (elem.canvas && elem.options && elem.primaryTrackLabelDiv) {
				drawBackground(elem)
			}
		});

		elem.playing = false;
		elem.errorMessage = null
		elem.isAudioLoading = true
		elem.canvas = null
		elem.options = null
		elem.params = elem.querySelectorAll('param');
		elem.arrayBuffers = {};
		elem.sources = {};
		elem.totalAudioLength = ""
		elem.isSmall = false
		elem.shouldLoop = true

		elem.targetLengthOfText = 125
		if(elem.isSmall){
			elem.targetLengthOfText = 75
		}

		elem.timestampLabelDiv = document.createElement('div');
		elem.timestampLabelDiv.style.margin = "5px"
		if (elem.isSmall) {
			elem.timestampLabelDiv.style.width = "50px"
		} else {
			elem.timestampLabelDiv.style.width = "100px"
		}
		elem.timestampLabelDiv.style.fontSize = "15px"
		elem.timestampLabelDiv.style.textAlign = "center"
		elem.timestampLabelDiv.innerHTML = displayTimeStamp(elem, 0, 0)

		elem.primaryTrackLabelDiv = document.createElement('div');
		elem.primaryTrackLabelDiv.innerHTML = ""
		elem.primaryTrackLabelDiv.style.margin = "5px"
		elem.primaryTrackLabelDiv.style.fontSize = "15px"

		if (elem.isSmall) {
			elem.canvasSize = 100
		} else {
			elem.canvasSize = 150
		}

		if (elem.isSmall) {
			elem.primaryTrackLabelDiv.style.width = "150px"
		} else {
			elem.primaryTrackLabelDiv.style.width = "400px"
		}
		// elem.primaryTrackLabelDiv.style.textAlign = "center"
		elem.primaryTrackLabelDiv.innerHTML = "<i>not playing</i>"

		elem.style.background = "rgb(241,243,244)"
		elem.style.display = "flex"
		elem.style.alignItems = "center"
		if (elem.isSmall) {
			elem.style.width = "350px"
		} else {
			elem.style.maxWidth = "600px"
		}
		elem.style.margin = "auto"
		elem.style.padding = "10px"
		elem.style.borderRadius = "105px"

		elem.canvas = document.createElement("canvas");
		elem.canvas.style.display = "inline-block"
		elem.timestampLabelDiv.style.display = "inline-block"
		elem.primaryTrackLabelDiv.style.display = "inline-block"

		elem.options = {}
		elem.params.forEach(function(param) {
			var name = param.getAttribute('name');
			var value = param.getAttribute('value');
			let id = name.split("-")[1]
			var role = name.split("-")[0]
			if (!(id in elem.options)) {
				elem.options[id] = {}
			}
			elem.options[id][role] = value
		});
		elem.countForLoaded = 0
		for (const [id, audioDetails] of Object.entries(elem.options)) {
			fetch(audioDetails['src'])
				.then(response => response.arrayBuffer())
				.then(arrayBuffer => {
					elem.arrayBuffers[id] = arrayBuffer
					elem.countForLoaded += 1
					if (elem.countForLoaded == Object.entries(elem.options).length) {
						elem.isAudioLoading = false
						drawBackground(elem)
					}
				}).catch((error) => {
					elem.errorMessage = "Error: " + error
					drawBackground(elem)
					console.log(error)
				});
		}

		// Set the width and height of the canvas
		elem.canvas.width = elem.canvasSize;
		elem.canvas.height = elem.canvasSize;
		// Get the 2D drawing context of the canvas
		var ctx = elem.canvas.getContext("2d");
		// Add the elem.canvas to the page
		drawBackground(elem)
		var intervalSaver = null

		async function decodeAudioData(audioCtx, arrayBuffer, callback) {
			bufferToUse = new ArrayBuffer(arrayBuffer.byteLength);
			new Uint8Array(bufferToUse).set(new Uint8Array(arrayBuffer));
			await audioCtx.decodeAudioData(bufferToUse).then((decodedData) => {
				callback(decodedData);
			});
		}

		elem.canvas.addEventListener('click', async function() {
			console.log("here?");
			if (!elem.playing) {
				console.log("here? too?");
				const promises = [];
				for (const [id, audioDetails] of Object.entries(elem.options)) {
					console.log("here? three?");
					if (!audioCtx) {
						audioCtx = new AudioContext();
					}
					const source = audioCtx.createBufferSource();
					const gain = audioCtx.createGain();
					promises.push(decodeAudioData(audioCtx, elem.arrayBuffers[id], (decodedData) => {
						source.arrayBuffer = decodedData;
						elem.totalAudioLength = (source.arrayBuffer.length / audioCtx.sampleRate)
						source.buffer = source.arrayBuffer;
						source.loop = elem.shouldLoop;
						source.connect(gain);
						gain.connect(audioCtx.destination);
						elem.sources[id] = {};
						elem.sources[id].gain = gain;
						elem.sources[id].source = source;
						console.log("adding thing!!!!")
					}));
				}

				await Promise.all(promises);

				updateGainsForValue(elem.canvasSize / 2, elem.canvasSize / 2, elem.sources, audioCtx, 0.05, elem, elem.options);
				var targetStartTime = audioCtx.currentTime + 0.2;
				for (const [id, _] of Object.entries(elem.options)) {
					console.log("here? five?")
					elem.sources[id].source.start(targetStartTime);
				}
				elem.countInSeconds = 0;
				console.log("here? four?");
				intervalSaver = setInterval(function() {
					elem.countInSeconds += 1;
					console.log("here? seven?")
					elem.timestampLabelDiv.innerHTML = displayTimeStamp(elem, elem.countInSeconds, elem.totalAudioLength)
					if (!elem.shouldLoop) {
						if (elem.countInSeconds > elem.totalAudioLength) {
							triggerEnd(elem)
						}
					}
				}, 1000);
				elem.playing = true;
				drawBackground(elem);
			}
		});

		function triggerEnd(elem) {
			for (const [id, audioDetails] of Object.entries(elem.options)) {
				elem.sources[id].source.stop()
			}
			clearInterval(intervalSaver)
			elem.timestampLabelDiv.innerHTML = displayTimeStamp(elem, 0, elem.totalAudioLength)
			elem.playing = false
			drawBackground(elem)
		}

		elem.canvas.addEventListener('mouseout', () => {
			triggerEnd(elem)
		});

		elem.canvas.addEventListener('mousemove', (event) => {
			if (elem.playing) {
				// Get the mouse x and y coordinates relative to the canvas
				const mouseX = event.clientX - elem.canvas.getBoundingClientRect().left;
				const mouseY = event.clientY - elem.canvas.getBoundingClientRect().top;
				updateGainsForValue(mouseX, mouseY, elem.sources, audioCtx, 0.1, elem, elem.options)
			}
		});

		// Add the select element to the page
		elem.appendChild(elem.canvas);
		elem.appendChild(elem.timestampLabelDiv);
		elem.appendChild(elem.primaryTrackLabelDiv);
		elem.style.marginTop = "25px"
		elem.style.marginBottom = "25px"
	}
});