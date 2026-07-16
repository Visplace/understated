Drop extracted hero background frames here, named:

frame-001.jpg
frame-002.jpg
frame-003.jpg
...

Any contiguous run works — the frontend auto-detects how many frames exist
at load time, so the exact count doesn't need to match anything in code.

To extract frames from a source clip with ffmpeg:

1. Check the clip's duration:
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 source.mp4

2. Pick a frame count (e.g. 50) and compute fps = frame_count / duration,
   then extract:
   ffmpeg -i source.mp4 -vf "fps=<computed_fps>,scale=1600:-1" -q:v 3 frame-%03d.jpg

Delete this README once frames are in place (it's harmless to leave, but the
folder should otherwise contain only the frame images).
