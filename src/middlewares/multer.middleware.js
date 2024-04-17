import multer from "multer";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp"); // Destination folder where uploaded files will be stored
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname); // Rename the file to avoid conflicts
    }
  });
  
export const upload = multer({ 
    storage,
});