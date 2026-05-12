#!/usr/bin/env python3
"""CatCam - snap one frame from the Mac camera. Saves to ~/Desktop/catcam.jpg"""
import subprocess, sys, os

OUTPUT = os.path.expanduser("~/Desktop/catcam.jpg")

def capture():
      # Try imagesnap first (brew install imagesnap)
      try:
                r = subprocess.run(["which", "imagesnap"], capture_output=True, text=True)
                if r.returncode == 0:
                              print("Using imagesnap...")
                              subprocess.run(["imagesnap", "-w", "1.0", OUTPUT], check=True, capture_output=True)
                              print(f"Saved to {OUTPUT}")
                              return True
      except Exception:
                pass

      # Try ffmpeg
      try:
                r = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True)
                if r.returncode == 0:
                              print("Using ffmpeg...")
                              subprocess.run([
                                  "ffmpeg", "-y", "-f", "avfoundation",
                                  "-framerate", "30", "-i", "0",
                                  "-frames:v", "1", "-q:v", "2", OUTPUT
                              ], check=True, capture_output=True, timeout=10)
                              print(f"Saved to {OUTPUT}")
                              return True
      except Exception:
                pass

      print("No capture tool found. Install one:")
      print("  brew install imagesnap")
      print("  brew install ffmpeg")
      return False

if __name__ == "__main__":
      print("CatCam starting...")
      if capture():
                print("Done! Check ~/Desktop/catcam.jpg")
else:
          sys.exit(1)
