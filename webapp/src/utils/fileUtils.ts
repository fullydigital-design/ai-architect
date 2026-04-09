const MAX_IMAGE_SIZE = 1024;

export const processImageFile = (file: File): Promise<{ base64: string; dataUrl: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('Failed to read file as a data URL.'));
      }
      
      const dataUrl = reader.result;
      const mimeType = file.type;
      const img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        let { width, height } = img;
        if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
          const base64 = dataUrl.split(',')[1];
          return resolve({ base64, dataUrl, mimeType });
        }

        if (width > height) {
          height = Math.round((height * MAX_IMAGE_SIZE) / width);
          width = MAX_IMAGE_SIZE;
        } else {
          width = Math.round((width * MAX_IMAGE_SIZE) / height);
          height = MAX_IMAGE_SIZE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context for image resizing.'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        const resizedDataUrl = canvas.toDataURL(mimeType);
        const base64 = resizedDataUrl.split(',')[1];
        resolve({ base64, dataUrl: resizedDataUrl, mimeType });
      };

      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
