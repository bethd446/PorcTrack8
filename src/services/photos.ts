import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

export interface PhotoEntry {
    photoId: string;
    subjectType: 'TRUIE' | 'BANDE' | 'SANTE' | 'NOTE' | 'VERRAT';
    subjectId: string;
    ts: number;
    localPath: string;
    webviewPath?: string;
    caption?: string;
}

const PHOTO_STORAGE = 'photos_index';

export async function takePhoto(subjectType: PhotoEntry['subjectType'], subjectId: string): Promise<PhotoEntry | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 90
    });

    const fileName = `PH-${Date.now()}.jpeg`;
    await Filesystem.writeFile({
      path: fileName,
      data: await base64FromPath(photo.webPath!),
      directory: Directory.Data
    });

    const newEntry: PhotoEntry = {
        photoId: `PH-${Date.now()}`,
        subjectType,
        subjectId,
        ts: Date.now(),
        localPath: fileName,
        webviewPath: photo.webPath
    };

    const { value } = await Preferences.get({ key: PHOTO_STORAGE });
    const photos: PhotoEntry[] = value ? JSON.parse(value) : [];
    photos.unshift(newEntry);

    await Preferences.set({
      key: PHOTO_STORAGE,
      value: JSON.stringify(photos)
    });

    return newEntry;
  } catch (e) {
    console.error('Error taking photo', e);
    return null;
  }
}

export async function getPhotosForSubject(subjectType: PhotoEntry['subjectType'], subjectId: string): Promise<PhotoEntry[]> {
    const { value } = await Preferences.get({ key: PHOTO_STORAGE });
    const photos: PhotoEntry[] = value ? JSON.parse(value) : [];

    const subjectPhotos = photos.filter(p => p.subjectType === subjectType && String(p.subjectId) === String(subjectId));

    // Load webview paths from filesystem
    for (const photo of subjectPhotos) {
        if (!photo.webviewPath) {
            const file = await Filesystem.readFile({
                path: photo.localPath,
                directory: Directory.Data
            });
            photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
        }
    }

    return subjectPhotos;
}

async function base64FromPath(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject('method did not return a string');
      }
    };
    reader.readAsDataURL(blob);
  });
}

export async function deletePhoto(photoId: string) {
    const { value } = await Preferences.get({ key: PHOTO_STORAGE });
    let photos: PhotoEntry[] = value ? JSON.parse(value) : [];

    const photoToDelete = photos.find(p => p.photoId === photoId);
    if (photoToDelete) {
        await Filesystem.deleteFile({
            path: photoToDelete.localPath,
            directory: Directory.Data
        });
    }

    photos = photos.filter(p => p.photoId !== photoId);
    await Preferences.set({
      key: PHOTO_STORAGE,
      value: JSON.stringify(photos)
    });
}
