/* Révélateur — seeing what is in a photo, on the device (MediaPipe Tasks for the web).
   Two small models, downloaded once and then kept by the service worker:
   - a face detector (BlazeFace, short range for selfies, full range as a second try for faces further away);
   - an image classifier (EfficientNet-Lite0, 1000 ImageNet labels; scenes.js groups them into scene types).
   The photo never leaves the device: the models run in the page. If they can't load, the auto works from the
   measurements alone. */
export const MP_VER = '1.1.1';
export const URLS = {
  lib: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/vision_bundle.mjs`,
  wasm: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/wasm`,
  face: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
  faceFar: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite',
  cls: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/int8/1/efficientnet_lite0.tflite'
};

let loading = null;
export const state = { status: 'off', msg: '' };   // off | loading | ready | failed
const listeners = new Set();
export const onVision = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const set = (status, msg = '') => { state.status = status; state.msg = msg; listeners.forEach(f => { try { f(state); } catch (e) { } }); };

export function loadVision() {
  if (loading) return loading;
  set('loading', 'Loading the on-device models');
  loading = (async () => {
    const mp = await import(/* @vite-ignore */ URLS.lib);
    const files = await mp.FilesetResolver.forVisionTasks(URLS.wasm);
    const make = (Cls, path, extra) => Cls.createFromOptions(files, { baseOptions: { modelAssetPath: path, delegate: 'CPU' }, runningMode: 'IMAGE', ...extra });
    const [face, cls] = await Promise.all([
      make(mp.FaceDetector, URLS.face, { minDetectionConfidence: 0.55 }),
      make(mp.ImageClassifier, URLS.cls, { maxResults: 5 })
    ]);
    let far = null;
    try { far = await make(mp.FaceDetector, URLS.faceFar, { minDetectionConfidence: 0.6 }); } catch (e) { far = null; }
    set('ready', 'On-device models ready');
    return { face, far, cls };
  })().catch(e => { loading = null; set('failed', 'Scene models unavailable: ' + (e && e.message || e)); throw e; });
  return loading;
}

/* source: a canvas (about 512 px). Returns { faces: [{x,y,w,h,score}] in 0..1, labels: [{i,p,name}] }. */
export async function see(source) {
  const m = await loadVision();
  const W = source.width, H = source.height;
  const boxes = r => (r && r.detections || []).map(d => ({ x: d.boundingBox.originX / W, y: d.boundingBox.originY / H, w: d.boundingBox.width / W, h: d.boundingBox.height / H, score: d.categories && d.categories[0] ? d.categories[0].score : 0 }))
    .filter(b => b.w > 0 && b.h > 0);
  let faces = boxes(m.face.detect(source));
  if (!faces.length && m.far) faces = boxes(m.far.detect(source));
  const c = m.cls.classify(source);
  const labels = (c && c.classifications && c.classifications[0] ? c.classifications[0].categories : []).map(x => ({ i: x.index, p: +x.score.toFixed(3), name: x.categoryName }));
  return { faces, labels };
}
