# Video Ad Setup Guide

## Quick Setup

### 1. Add Your Video
Place your video file in the `public/videos/` directory:
```
public/videos/your-ad-video.mp4
```

### 2. Update Configuration
In `src/app/novel/[id]/chapter/[chapter]/page.js`, update this line:
```javascript
const AD_VIDEO_PATH = "/videos/your-ad-video.mp4"; // Change to your filename
```

### 3. Recommended Video Specs
- **Format**: MP4
- **Encoding**: H.264
- **Aspect Ratio**: 16:9 (1280x720 or 1920x1080)
- **Duration**: 15-30 seconds
- **File Size**: Under 50MB for fast loading
- **Audio**: Include audio track for better engagement

## How It Works

1. **User clicks "Watch Ad - Free Unlock"**
2. **Video plays** in a fullscreen overlay
3. **Auto-unlock** when video completes
4. **Daily limit** enforced (1 chapter per day)

## Video Behavior

- **Autoplay**: Video starts automatically
- **Controls**: Users can pause/play but not skip
- **Fullscreen**: Plays in centered overlay
- **Completion**: Chapter unlocks when video ends
- **Timeout**: 30-second max wait time

## Testing Your Video

1. Add your video to `public/videos/`
2. Update the `AD_VIDEO_PATH` constant
3. Test with a user account that has < 0.0025 SMP
4. Click the ad unlock button
5. Verify video plays and chapter unlocks

## Troubleshooting

### Video Not Playing
- Check file path in `AD_VIDEO_PATH`
- Verify video format (MP4 recommended)
- Ensure video is in `public/videos/` directory

### Chapter Not Unlocking
- Check browser console for errors
- Verify video plays to completion
- Check database connection

### Performance Issues
- Optimize video file size
- Use H.264 encoding
- Consider video resolution (720p recommended)

## Future Enhancements

When you're ready for more advanced features:

1. **Multiple Videos**: Random video selection
2. **Ad Network Integration**: Real ad serving
3. **Analytics**: Track ad completion rates
4. **Rewards**: Variable unlock rewards
5. **Skip Options**: Allow skipping after X seconds

## File Structure
```
public/
  videos/
    your-ad-video.mp4  # Your ad video
    README.md          # This file

src/app/novel/[id]/chapter/[chapter]/
  page.js              # Main implementation (line 59: AD_VIDEO_PATH)
```
