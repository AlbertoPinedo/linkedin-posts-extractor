function extractPosts() {
  // Helper function to get text content and handle null
  function getTextContent(element) {
    if (!element) return "";

    // Convert <br> tags to newline characters
    const html = element.innerHTML;
    const withLineBreaks = html.replace(/<br\s*\/?>/gi, "\n");

    // Create a temporary div to handle the HTML to text conversion
    const temp = document.createElement("div");
    temp.innerHTML = withLineBreaks;

    // Get text content while preserving line breaks
    const paragraphs = temp.querySelectorAll("p, span, div");
    if (paragraphs.length > 0) {
      return Array.from(paragraphs)
        .map((p) => p.textContent.trim())
        .filter((text) => text) // Remove empty lines
        .join("\n");
    }

    return temp.textContent.trim();
  }

  // Helper function to extract number from string (e.g., "1,234 views" → 1234)
  function extractNumber(text) {
    if (!text) return 0;
    // Remove all spaces and commas between digits
    const cleanedText = text.replace(/(\d)[,\s](?=\d)/g, "$1");
    // Find the first sequence of digits
    const matches = cleanedText.match(/\d+/);
    return matches ? parseInt(matches[0]) : 0;
  }

  function getPostId(linkedinURL) {
    const regex = /([0-9]{19})/;
    return linkedinURL.match(regex)?.[0];
  }

  function extractUnixTimestamp(postId) {
    return parseInt(BigInt(postId).toString(2).slice(0, 41), 2);
  }

  function formatDate(date) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[date.getDay()];
    return `${weekday}, ${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} @ ${date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
  }

  function unixTimestampToHumanDate(timestamp) {
    const dateObject = new Date(timestamp);
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `${formatDate(dateObject)}<br />${localTimezone} (GMT${dateObject.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(dateObject.getTimezoneOffset() / 60)})`;
  }

  function getDate(linkedinURL) {
    const postId = getPostId(linkedinURL);
    const unixTimestamp = extractUnixTimestamp(postId);
    return unixTimestampToHumanDate(unixTimestamp);
  }

  function extractDate(linkedInUrl) {
    return getDate(linkedInUrl);
  }

  // Helper function to download an image
  function downloadImage(url, filename) {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(console.error);
  }

  // Main extraction logic
  function extractPostData() {
    const posts = [];
    const postElements = document.querySelectorAll(".JCniPHMkzeWTJVYtYcBxPACGcXOBjlBoflxc"); // change this identifier for yours
    

    postElements.forEach((post, index) => {
      // Check if it's a repost by looking for repost indicators
      const isRepost =
        post.querySelector(".feed-shared-actor__description") || // Checks for "reposted" text
        post.querySelector(".feed-shared-actor__sub-description") || // Checks for "Reposted" label
        post.querySelector(".feed-shared-reshared-text") || // Checks for "Shared a post" text
        post.querySelector(".update-components-header__text-view"); // Checks for "Shared a post" text

      // Skip this post if it's a repost
      if (isRepost) {
        return;
      }

      // Extract post text with preserved line breaks
      const postContent = getTextContent(
        post.querySelector(".tvm-parent-container"),
      );

      // Remove all occurrences of the word "hashtag"
      textContent = postContent.replace(/\bhashtag\b/gi, "");

      // ignore posts with no text or small text
      if (textContent.length < 100) {
        return;
      }

      // Extract engagement metrics
      const reactions = extractNumber(
        getTextContent(
          post.querySelector(".social-details-social-counts__reactions-count"),
        ),
      );

      const comments = extractNumber(
        getTextContent(
          post.querySelector(".social-details-social-counts__comments"),
        ),
      );

      // Extract impressions (views)
      const impressionsElement = post.querySelector(
        ".ca-entry-point__num-views",
      );
      const impressions = impressionsElement
        ? extractNumber(impressionsElement.textContent)
        : 0;
      
      
      
      // Extract post URL
      const regex = /"urn:li:activity:[^"]*"/g;
      const match = post.innerHTML.match(regex);  
      const dataUrn = match ? match[0].replace(/"/g, "") : "";
      postUrl = dataUrn ? `https://www.linkedin.com/feed/update/${dataUrn}` : "";

      // Extract post Date
      const postDate = extractDate(postUrl);


      // Extract image URLs
      //const imageElements = post.querySelectorAll("img");
      //const imageUrls = Array.from(imageElements).map(img => img.src);
      //extract only post images
      const imageElements = post.querySelectorAll(".update-components-image__container .ivm-image-view-model .ivm-view-attr__img-wrapper img");
      const imageUrls = Array.from(imageElements).map((img) => img.src);

      // Download images
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');

      imageUrls.forEach((url, imgIndex) => {
        const filename = `${year}/${month}/post_${index + 1}_img_${imgIndex + 1}.jpg`;
        downloadImage(url, filename);
      });

      
      // Only add if there's actual content
      if (textContent) {
        posts.push({
          content: textContent,
          reactions: reactions,
          comments: comments,
          impressions: impressions,
          images: imageUrls,
          datePost: postDate,
          url: postUrl,
        });
      }
    });

    return posts;
  }

  // Execute extraction
  const extractedPosts = extractPostData();

  // Log the number of posts found (helpful for debugging)
  console.log(`Found ${extractedPosts.length} original posts`);

  // Create and download file
  const blob = new Blob([JSON.stringify(extractedPosts, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `linkedin_posts_${new Date().toISOString().split("T")[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

document.getElementById("extractPosts").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  console.log("extracting posts...");

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractPosts,
  });
});
