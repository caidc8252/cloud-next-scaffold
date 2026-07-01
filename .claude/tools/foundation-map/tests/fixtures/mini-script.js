function updatePanels(){
  var a = 1;
  return a;
}
function metadataValid(){
  return fieldErrors().length === 0;
}
function finishScan(kind){
  setInterval(function(){ tick(); }, 100);
}
