import * as tf from "@tensorflow/tfjs";

/**
 * Perform Non-Maximum Suppression on the GPU.
 * @param {tf.Tensor} res Output tensor from the YOLOv7 model of shape [1, num_boxes, num_classes + 5]
 * @param {number} confThresh Confidence score threshold
 * @param {number} iouThresh Intersection Over Union threshold
 * @param {number} maxDet Maximum number of detections
 * @returns {Promise<[Float32Array, Float32Array, Int32Array]>} Selected [boxes, scores, classes]
 */
export async function non_max_suppression_gpu(res, confThresh = 0.50, iouThresh = 0.45, maxDet = 100) {
  // Squeeze res to shape [num_boxes, num_classes + 5]
  const resSqueezed = res.squeeze([0]);
  const numBoxes = resSqueezed.shape[0];

  // Boxes: slice first 4 columns [x, y, w, h]
  const boxes = resSqueezed.slice([0, 0], [numBoxes, 4]);

  // Convert boxes from [x_center, y_center, w, h] to [y1, x1, y2, x2] for tf.image.nonMaxSuppressionAsync
  const [x, y, w, h] = tf.split(boxes, 4, 1);
  const x1 = tf.sub(x, tf.div(w, 2));
  const y1 = tf.sub(y, tf.div(h, 2));
  const x2 = tf.add(x, tf.div(w, 2));
  const y2 = tf.add(y, tf.div(h, 2));
  const boxes_yxyx = tf.concat([y1, x1, y2, x2], 1);

  // Scores: conf * max_class_prob
  const confs = resSqueezed.slice([0, 4], [numBoxes, 1]);
  const classes = resSqueezed.slice([0, 5], [numBoxes, -1]);
  const maxClassProbs = classes.max(1, true);
  const scores = tf.mul(confs, maxClassProbs).squeeze([1]);
  const classIndices = classes.argMax(1);

  // Run async NMS on GPU (falls back to WebGL shaders or WASM)
  const nmsIdx = await tf.image.nonMaxSuppressionAsync(
    boxes_yxyx,
    scores,
    maxDet,
    iouThresh,
    confThresh
  );

  // Gather selected box coordinates, scores, and classes
  const selectedBoxesYxyx = tf.gather(boxes_yxyx, nmsIdx);
  const selectedScores = tf.gather(scores, nmsIdx);
  const selectedClasses = tf.gather(classIndices, nmsIdx);

  // Reorder coordinates from [y1, x1, y2, x2] to [x1, y1, x2, y2] for canvas rendering
  const y1_s = selectedBoxesYxyx.slice([0, 0], [-1, 1]);
  const x1_s = selectedBoxesYxyx.slice([0, 1], [-1, 1]);
  const y2_s = selectedBoxesYxyx.slice([0, 2], [-1, 1]);
  const x2_s = selectedBoxesYxyx.slice([0, 3], [-1, 1]);
  const selectedBoxesXyxy = tf.concat([x1_s, y1_s, x2_s, y2_s], 1);

  // Transfer data asynchronously to CPU
  const [boxesData, scoresData, classesData] = await Promise.all([
    selectedBoxesXyxy.data(),
    selectedScores.data(),
    selectedClasses.data()
  ]);

  // Clean up all intermediate GPU tensors
  tf.dispose([
    resSqueezed,
    boxes,
    x, y, w, h,
    x1, y1, x2, y2,
    boxes_yxyx,
    confs,
    classes,
    maxClassProbs,
    scores,
    classIndices,
    nmsIdx,
    selectedBoxesYxyx,
    selectedScores,
    selectedClasses,
    y1_s, x1_s, y2_s, x2_s,
    selectedBoxesXyxy
  ]);

  return [boxesData, scoresData, classesData];
}