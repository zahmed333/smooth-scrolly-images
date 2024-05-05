let eye = document.querySelectorAll("#eyes img");

function setEyes(e) {
	let pointerEvent = e;
    if (e.targetTouches && e.targetTouches[0]) {
    	e.preventDefault(); 
        pointerEvent = e.targetTouches[0];
        mouseX = pointerEvent.pageX;
        mouseY = pointerEvent.pageY;
    } else {
        mouseX = e.clientX + window.pageXOffset,
        mouseY = e.clientY + window.pageYOffset;
    }
	for (let i = 0; i < eye.length; i++) {
    let offset = eye[i].getBoundingClientRect();
    eye[i]['centerX'] = offset.left + offset.width/2,
    eye[i]['centerY'] = offset.top + offset.height/2;
}
	for (var i = 0; i < eye.length; i++) {
				let rads = Math.atan2(mouseX - eye[i]['centerX'], mouseY - eye[i]['centerY']),
				degs = rads * ((180 / Math.PI) * -1),
				nearest = Math.abs(45 * Math.round(degs/45) + 180);    				 if (nearest == 360) nearest = 0;
				eye[i].src = "eye-"+nearest+".png";
		}
}

window.addEventListener('mousemove', setEyes);
window.addEventListener('touchstart', setEyes);
window.addEventListener('touchmove', setEyes);