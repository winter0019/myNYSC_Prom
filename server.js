const express = require('express');
const path = require('path');

const app = express();
// Render sets the PORT environment variable.
const port = process.env.PORT || 3000;

// Serve static files from the 'dist' directory, which is where Vite builds the app
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// For any other request, fall back to serving index.html.
// This is crucial for single-page applications like React.
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});