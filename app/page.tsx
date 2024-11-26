// import Image from "next/image";
"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [value, setValue] = useState("");
  const [videoId, setVideoId] = useState("");
  const [urlIsSet, setUrlIsSet] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const url = searchParams.get("value");
  console.log(url);

  useEffect(() => {
    if (url) {
      setUrlIsSet(true);
      setVideoId(extractYouTubeVideoId(url) || ""); //@TODO: FIX
    } else {
      setUrlIsSet(false);
    }
  }, [url]);
  const handleButtonClick = () => {
    router.push(`/?value=${encodeURIComponent(value)}`);
  };

  function extractYouTubeVideoId(url: string) {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname === "youtu.be") {
        // Shortened YouTube URL (e.g., https://youtu.be/RmCauddkUDQ)
        return parsedUrl.pathname.slice(1); // Remove the leading '/'
      }

      if (
        parsedUrl.hostname === "www.youtube.com" ||
        parsedUrl.hostname === "youtube.com"
      ) {
        // Standard YouTube URL (e.g., https://www.youtube.com/watch?v=RmCauddkUDQ)
        const videoId = parsedUrl.searchParams.get("v");
        if (videoId) return videoId;

        // Embedded YouTube URL (e.g., https://www.youtube.com/embed/RmCauddkUDQ)
        if (parsedUrl.pathname.startsWith("/embed/")) {
          return parsedUrl.pathname.split("/embed/")[1];
        }

        // Other potential formats can be handled here if needed
      }
    } catch (error) {
      console.error("Invalid URL:", error);
    }

    return null; // Return null if no video ID is found
  }

  const playerRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(30);
  const [endTime, setEndTime] = useState(60); // Default end time

  const sliderStartRef = useRef(null);
  const sliderEndRef = useRef(null);
  const rangeRef = useRef(null);

  const endTimeRef = useRef(endTime); // Create a ref to store endTime

  // Sync the ref whenever endTime state updates
  useEffect(() => {
    endTimeRef.current = endTime;
  }, [endTime]);

  // Initialize YouTube Iframe API
  useEffect(() => {
    const loadYouTubeAPI = () => {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        playerRef.current = new YT.Player("youtube-player", {
          videoId,
          playerVars: {
            enablejsapi: 1,
            controls: 0,
            modestbranding: 0,
            rel: 0,
            showinfo: 0
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        });
      };
    };
    const onPlayerStateChange = (event) => {
      if (event.data === YT.PlayerState.PLAYING) {
        const checkTime = () => {
          const currentTime = playerRef.current.getCurrentTime();
          if (currentTime >= endTimeRef.current) {
            playerRef.current.pauseVideo();
            console.log(currentTime, endTimeRef.current, duration);
            playerRef.current.seekTo(startTime, true); // Reset to startTime when the clip ends
          } else {
            requestAnimationFrame(checkTime); // Keep checking while playing
          }
        };
        requestAnimationFrame(checkTime);
        // setTimeout(() => requestAnimationFrame(checkTime), (endTime - startTime) * 1000);
      }
    };
    if (!window.YT) loadYouTubeAPI();
    else window.onYouTubeIframeAPIReady();

    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, [videoId]);

  const onPlayerReady = () => {
    const player = playerRef.current;
    setDuration(player.getDuration());
    setEndTime(player.getDuration());
  };

  // Helper functions
  const timeToPercent = (time) => (time / duration) * 100;
  const percentToTime = (percent) => (percent / 100) * duration;

  const updateSliders = () => {
    const startPercent = timeToPercent(startTime);
    const endPercent = timeToPercent(endTime);
    if (sliderStartRef.current && rangeRef.current && sliderEndRef.current) {
      sliderStartRef.current.style.left = `${startPercent}%`;
      sliderEndRef.current.style.left = `${endPercent}%`;

      rangeRef.current.style.left = `${startPercent}%`;
      rangeRef.current.style.width = `${endPercent - startPercent}%`;
    }
  };

  const handleSliderDrag = (isStart) => (e) => {
    const seeker = document.getElementById("custom-seeker");
    const rect = seeker.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = Math.min(Math.max(offsetX / rect.width, 0), 1) * 100;

    if (isStart) {
      const newStartTime = Math.min(
        Math.round(percentToTime(percent)),
        endTime
      );
      setStartTime(newStartTime);
      sliderStartRef.current.style.left = `${percent}%`;
    } else {
      const newEndTime = Math.max(
        Math.round(percentToTime(percent)),
        startTime
      );
      setEndTime(newEndTime);
      sliderEndRef.current.style.left = `${percent}%`;
    }

    rangeRef.current.style.left = sliderStartRef.current.style.left;
    rangeRef.current.style.width = `${
      parseFloat(sliderEndRef.current.style.left) -
      parseFloat(sliderStartRef.current.style.left)
    }%`;
  };

  // Sync video playback
  const handleInputChange = (type, value) => {
    const time = Math.min(Math.max(Math.round(Number(value)), 0), duration);
    if (type === "start") {
      setStartTime(time);
      playerRef.current.seekTo(time, true);
    } else {
      setEndTime(time);
      console.log(endTime, time);
    }
  };

  // Play button logic: Always start playback from `startTime`
  const handlePlayClip = () => {
    playerRef.current.seekTo(startTime, true); // Ensure playback begins from the adjusted start time
    playerRef.current.playVideo();
  };

  // Initial slider positioning
  useEffect(() => {
    updateSliders();
  }, [startTime, endTime]);

  return (
    <>
      <div className="text-2xl p-4 border-b border-black hover:underline">
        <Link href="/">Clipper</Link>
      </div>
      <div className="w-full p-4">
        {!urlIsSet ? (
          <div className="w-11/12 md:w-8/12 text-center mx-auto">
            <p className="text-xl">Enter video URL</p>
            <input
              onChange={(e) => setValue(e.target.value)}
              value={value}
              type="text"
              placeholder="youtube.com/watch?v=YouTubsd"
              className="w-full md:w-5/12 p-2 rounded-md bg-light my-4"
            />
            <div className="flex justify-center">
              <button
                className=" bg-light rounded-md p-2 px-4"
                onClick={() => handleButtonClick()}
              >
                load video
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            {url && (
              <div>
                <div className="w-full">
                  <iframe
                    id="youtube-player"
                    width="560"
                    height="315"
                    src={`https://www.youtube.com/embed/${extractYouTubeVideoId(
                      url as string
                    )}?enablejsapi=1&version=3&playerapiid=ytplayer&controls=0`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  ></iframe>
                </div>

                <div
                  id="custom-seeker"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "10px",
                    background: "#ddd",
                    borderRadius: "5px",
                    margin: "10px 0",
                  }}
                >
                  <div
                    id="range"
                    ref={rangeRef}
                    style={{
                      position: "absolute",
                      height: "100%",
                      background: "rgba(0, 123, 255, 0.5)",
                    }}
                  ></div>
                  <div
                    id="slider-start"
                    ref={sliderStartRef}
                    style={{
                      position: "absolute",
                      width: "10px",
                      height: "20px",
                      background: "#007bff",
                      borderRadius: "5px",
                      top: "-5px",
                      cursor: "pointer",
                    }}
                    onMouseDown={(e) => {
                      const moveHandler = handleSliderDrag(true);
                      window.addEventListener("mousemove", moveHandler);
                      window.addEventListener("mouseup", () => {
                        window.removeEventListener("mousemove", moveHandler);
                      });
                    }}
                  ></div>
                  <div
                    id="slider-end"
                    ref={sliderEndRef}
                    style={{
                      position: "absolute",
                      width: "10px",
                      height: "20px",
                      background: "#007bff",
                      borderRadius: "5px",
                      top: "-5px",
                      cursor: "pointer",
                    }}
                    onMouseDown={(e) => {
                      const moveHandler = handleSliderDrag(false);
                      window.addEventListener("mousemove", moveHandler);
                      window.addEventListener("mouseup", () => {
                        window.removeEventListener("mousemove", moveHandler);
                      });
                    }}
                  ></div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6/12">
                    <label>Start Time (s):</label> <br />
                    <input
                      className="p-2 w-full rounded-md"
                      type="number"
                      value={startTime}
                      onChange={(e) =>
                        handleInputChange("start", e.target.value)
                      }
                    />
                  </div>

                  <div className="w-6/12">
                    <label>End Time (s):</label>
                    <br />
                    <input
                      className="p-2 w-full rounded-md"
                      type="number"
                      value={endTime}
                      onChange={(e) => handleInputChange("end", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handlePlayClip}
                    className=" bg-light rounded-md p-2 px-4 "
                  >
                    Play Clip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
