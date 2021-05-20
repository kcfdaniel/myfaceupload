const video = document.getElementById('video')
var canvas = null
const photoContainer = document.getElementById('photoContainer')
const photoLinkDiv = document.getElementById('photoLinkDiv')
const retakePhotoDiv = document.getElementById('retakePhotoDiv')
video.onclick = function() {
  capturePhoto()
};

function copyLink(){
  var photoLink = document.getElementById("photoLink");
  photoLink.style.display = 'initial'

  photoLink.select();
  photoLink.setSelectionRange(0, 99999); /*For mobile devices*/

  console.log(photoLink.value)

  document.execCommand("copy");
  photoLink.style.display = 'none'


  var copyLinkToast = document.getElementById("copyLinkToast");
  if(copyLinkToast.className == "show"){
    return
  }
  copyLinkToast.className = "show";
  setTimeout(function(){ copyLinkToast.className = copyLinkToast.className.replace("show", ""); }, 3000);
}

function setCaptured(captured){
  if (captured){
    video.style.display = 'none'
    canvas.style.display = 'none'
    photoContainer.style.display = 'flex'
    photoLinkDiv.style.display = 'flex'
    retakePhotoDiv.style.display = 'flex'
  }
  else{
    video.style.display = 'initial'
    canvas.style.display = 'initial'
    photoContainer.style.display = 'none'
    photoLinkDiv.style.display = 'none'
    retakePhotoDiv.style.display = 'none'
  }
}

var detections = []
var dataURL = ""

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
]).then(startVideo)

function startVideo() {
  constraints = { video: true }
  navigator.mediaDevices.getUserMedia(constraints)
  .then(function(stream) {
    video.srcObject = stream
    video.play();
  })
  .catch(function(err) {
    console.error(err)
  });
}

function capturePhoto(){
  console.log("capturePhoto")

  if (detections.length == 0){
    return
  }

  const sx = detections[0].box.x
  const sy = detections[0].box.y
  const swidth = detections[0].box.width
  const sheight = detections[0].box.height

  const tempCanvas = faceapi.createCanvasFromMedia(video)

  tempCanvas.width =swidth;
  tempCanvas.height =sheight;

  var context = tempCanvas.getContext('2d');

  context.drawImage(video, sx, sy, swidth, sheight, 0, 0, swidth, sheight);
  dataURL = tempCanvas.toDataURL();
  console.log(dataURL)

  //create img
  var img = document.createElement('img');
  img.setAttribute('src', dataURL);

  //append img in container div
  var child = photoContainer.lastElementChild

  while (child){
    photoContainer.removeChild(child)
    child = photoContainer.lastElementChild
  }
  document.getElementById('photoContainer').appendChild(img);

  setCaptured(true)
  handleFileUpload()
}

video.addEventListener('play', async () => {
  console.log("play")
  console.log(video.readyState)
  while (video.readyState != 4){
    console.log(video.readyState)
    await sleep(100)
  }

  if (canvas){
    document.body.removeChild(canvas)
  }
  canvas = faceapi.createCanvasFromMedia(video)
  canvas.id = "canvas"
  document.body.append(canvas)
  const displaySize = { width: video.clientWidth, height: video.clientHeight }
  faceapi.matchDimensions(canvas, displaySize)
  setInterval(async () => {
    detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
  }, 100)
})

//for firebase upload
var storageRef = firebase.storage().ref();
function handleFileUpload() {
  var file = dataURItoBlob(dataURL);

  console.log({file})
  
  var metadata = {
    'contentType': file.type
  };
  // Push to child path.
  // [START oncomplete]
  storageRef.child('images/' + 'image').put(file, metadata).then(function(snapshot) {
    console.log('Uploaded', snapshot.totalBytes, 'bytes.');
    console.log('File metadata:', snapshot.metadata);
    // Let's get a download URL for the file.
    snapshot.ref.getDownloadURL().then(function(url) {
      console.log('File available at', url);
      photoLink.value = url
      // [START_EXCLUDE]
    });
  }).catch(function(error) {
    // [START onfailure]
    console.error('Upload failed:', error);
    // [END onfailure]
  });
  // [END oncomplete]
}

function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  //Old Code
  //write the ArrayBuffer to a blob, and you're done
  //var bb = new BlobBuilder();
  //bb.append(ab);
  //return bb.getBlob(mimeString);

  //New Code
  return new Blob([ab], {type: mimeString});


}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}