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
    const img = tf.browser.fromPixels(source);
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
    const input = tf.tidy(() => {
      const img = tf.image
                  .resizeBilinear(tf.browser.fromPixels(videoRef.current), [640, 640])
                  .div(255.0)
                  .transpose([2, 0, 1])
                  .expandDims(0);
      return img
    });

    await model.executeAsync(input).then((res) => {

      //TODO: Finish implementation of the non_max_suppression 
      //console.log('res.shape: ', res.shape);
      const res_lenght = res.shape[1];
      //console.log('res_lenght: ', res_lenght);
      res = res.arraySync()[0];
      //console.log('res: ', res);
      //Non maximum implementation
      const conf_thres = 0.25;
      //console.log('Filtering...');
      res = res.filter(dataRow => dataRow[4]>=conf_thres);
      //console.log('filtered: ', res);

      //Settings
      // const [min_wh, max_wh] = [2,4096]; // (pixels) minimum and maximum box width and height
      // const max_det = 300;  // maximum number of detections per image
      // const max_nms = 30000;  // maximum number of boxes into torchvision.ops.nms()
      // const time_limit = 10.0;  // seconds to quit after
      // const redundant = True;  // require redundant detections
      // //const multi_label &= nc > 1  // multiple labels per box (adds 0.5ms/img)
      // const merge = False;  // use merge-NMS

      var boxes = [];
      var class_detect = [];
      var scores = [];
      res.forEach(myFunction);
      function myFunction(value, index, array){
        const box = value.slice(0,4);
        boxes.push(box);
        
        const cls_detections = value.slice(5, 85);
       // console.log('cls_detection_lenght: ', cls_detections.length);
        var max_score_index = cls_detections.reduce((imax, x, i, arr) => x > arr[imax] ? i : imax, 0);
        class_detect.push(max_score_index);
        scores.push(value[max_score_index + 5]);
        //console.log('Class: ', labels[max_score_index]);
        
        // console.log('value: ', value); //the prediction I'm iterating
        // console.log('index: ', index); //the index
        // console.log('array: ', array); //All the predictions
        //console.log('---------------');
      }
      console.log("boxes: ", boxes);
      console.log("scores: ", scores);
      console.log("class_detect: ", class_detect);


      //console.log('res[0].shape: ', res[0].shape);
      //console.log('dims 1: ', res.arraySync()[0].lenght);
      const [boxes_data, scores_data, classes_data] = [0,0,0];//non_max_suppression (res, canvasRef, threshold);
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
