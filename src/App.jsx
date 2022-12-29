import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import Loader from "./components/loader";
import { Webcam } from "./utils/webcam";
import { renderBoxes } from "./utils/renderBox";
//import {non_max_suppression} from "./utils/max_suppression"
import "./style/App.css";

const labels = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
];

// import {
//   non_max_suppression,
//   yolo_boxes_to_corners,
//   yolo_head,
//   yolo_filter_boxes,
//   YOLO_ANCHORS,
// } from './utils/post_process';
/**
 * Function to detect image.
 * @param {HTMLCanvasElement} canvasRef canvas reference
 */

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcam = new Webcam();

  // configs
  const modelName = "yolov7";
  const threshold = 0.80;

  /**
   * Function to detect every frame loaded from webcam in video tag.
   * @param {tf.GraphModel} model loaded YOLOv5 tensorflow.js model
   */
  const preprocess = (source) =>{
    //TODO: I`m resizing the image and not using the pad back when writing it. Pls fix
    const img = tf.browser.fromPixels(source);
    console.log("img shape: ", img.shape);
    // padding image to square => [n, m] to [n, n], n > m
    const [h, w] = img.shape.slice(0, 2); // get source width and height
    const maxSize = Math.max(w, h); // get max size
    const imgPadded = img.pad([
      [0, maxSize - h], // padding y [bottom only]
      [0, maxSize - w], // padding x [right only]
      [0, 0],
    ]);

    const xratio = maxSize / w; // update xRatio
    const yratio = maxSize / h; // update yRatio

    return [xratio, yratio]
  }

  const detectFrame = async (model) => {
    tf.engine().startScope();
    let [modelWidth, modelHeight] = model.inputs[0].shape.slice(1, 3);
    const [xratio, yratio] = preprocess(videoRef.current);
    // console.log("xRatio: ", xratio);
    // console.log("yRatio: ", yratio);
    //TODO: Maybe I have to pad the image before send it: https://github.com/Hyuto/yolov5-tfjs/blob/82b0777ac629799c3daebc35cc93ea17f5633d18/src/utils/detect.js#L11
    const input = tf.tidy(() => {
      const img = tf.image
                  .resizeBilinear(tf.browser.fromPixels(videoRef.current), [640, 640])
                  .div(255.0)
                  .transpose([2, 0, 1])
                  .expandDims(0);
      //console.log("img shape: ", img.shape); // [1, 3, 640, 640]
      return img
    });

    await model.executeAsync(input).then((res) => {

      //TODO: Finish implementation of the non_max_suppression 
      res = res.arraySync()[0];
      //Filtering only detections with a confidence higher than the threshold
      const conf_thres = 0.25;
      res = res.filter(dataRow => dataRow[4]>=conf_thres);
      //Here the non_max_supression is not applied yet. Still multiple bboxes for the same detection

      var boxes = [];
      var class_detect = [];
      var scores = [];
      res.forEach(process_pred);

      function process_pred(res){
        const box = res.slice(0,4);
        boxes.push(box);      
        const cls_detections = res.slice(5, 85);
        var max_score_index = cls_detections.reduce((imax, x, i, arr) => x > arr[imax] ? i : imax, 0);
        class_detect.push(max_score_index);
        scores.push(res[max_score_index + 5]);
      }

      //Rendering boxes
      renderBoxes(canvasRef, threshold, boxes, scores, class_detect, [xratio, yratio]);

      tf.dispose(res);
    });

    requestAnimationFrame(() => detectFrame(model)); // get another frame
    tf.engine().endScope();
  };

  useEffect(() => {
    tf.loadGraphModel(`${window.location.origin}/${modelName}_web_model/model.json`, {
      onProgress: (fractions) => {
        setLoading({ loading: true, progress: fractions });
      },
    }).then(async (yolov5) => {
      // Warmup the model before using real data.
      const dummyInput = tf.ones(yolov5.inputs[0].shape);
      await yolov5.executeAsync(dummyInput).then((warmupResult) => {
        tf.dispose(warmupResult);
        tf.dispose(dummyInput);

        setLoading({ loading: false, progress: 1 });
        webcam.open(videoRef, () => detectFrame(yolov5));
      });
    });
  }, []);

  return (
    <div className="App">
      <h2>Object Detection Using YOLOv7 & Tensorflow.js</h2>
      {loading.loading ? (
        <Loader>Loading model... {(loading.progress * 100).toFixed(2)}%</Loader>
      ) : (
        <p>Currently running model : YOLOv5{modelName.slice(6)}</p>
      )}

      <div className="content">
        <video autoPlay playsInline muted ref={videoRef} />
        <canvas width={640} height={640} ref={canvasRef} />
      </div>
    </div>
  );
};

export default App;
