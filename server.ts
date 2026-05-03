import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Virtual Filesystem State
  let virtualFiles: any[] = [
    { id: "1", name: "readme.txt", content: "Welcome to LimeVM v1.0. Virtual disk ready.", size: 42, type: "text/plain" },
    { id: "2", name: "boot_log.sys", content: "System initialized. Cluster Sync Active.", size: 128, type: "application/octet-stream" }
  ];

  // Browser state
  let browser: any = null;
  let page: any = null;
  let isStreaming = false;

  const formatUrl = (input: string) => {
    let url = input.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try {
      new URL(url);
      return url;
    } catch (e) {
      return null;
    }
  };

  const launchBrowser = async (urlInput: string, socket: any) => {
    const url = formatUrl(urlInput);
    
    if (!url) {
      socket.emit("error", `Invalid URL: ${urlInput}`);
      console.error(`LimeAPI Error: Invalid URL provided - ${urlInput}`);
      return;
    }

    try {
      if (browser) {
        await browser.close();
        browser = null;
      }
      
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          "--hide-scrollbars",
          "--disable-web-security",
          "--no-sandbox",
          "--enable-gpu",
          "--use-gl=angle",
          "--enable-webgl",
          "--ignore-gpu-blocklist",
          "--enable-accelerated-2d-canvas",
          "--enable-gpu-rasterization",
          "--disable-software-rasterizer"
        ],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      console.log(`LimeAPI: Navigation successful to ${url}`);
    } catch (err: any) {
      console.error("LimeAPI Error:", err);
      socket.emit("error", `Navigation failed: ${err.message || String(err)}`);
    }
  };

  io.on("connection", (socket) => {
    console.log("LimeNode: Client connected");

    socket.on("start-vm", async (url) => {
      await launchBrowser(url, socket);
      isStreaming = true;
      streamFrames(socket);
    });

    socket.on("mouse-down", async ({ x, y, button }) => {
      if (page) {
        try {
          await page.mouse.move(x, y);
          await page.mouse.down({ button: button || 'left' });
          console.log(`LimeAPI: Emulated mouse-down [${button || 'left'}] at [${x}, ${y}]`);
        } catch (e) {}
      }
    });

    socket.on("mouse-up", async ({ x, y, button }) => {
      if (page) {
        try {
          await page.mouse.move(x, y);
          await page.mouse.up({ button: button || 'left' });
          console.log(`LimeAPI: Emulated mouse-up [${button || 'left'}] at [${x}, ${y}]`);
        } catch (e) {}
      }
    });

    socket.on("mouse-move", async ({ x, y }) => {
      if (page) {
        try {
          await page.mouse.move(x, y);
        } catch (e) {}
      }
    });

    socket.on("mouse-click", async ({ x, y }) => {
      if (page) {
        try {
          await page.mouse.click(x, y);
        } catch (e) {}
      }
    });

    socket.on("mouse-right-click", async ({ x, y }) => {
      if (page) {
        try {
          await page.mouse.click(x, y, { button: 'right' });
          console.log(`LimeAPI: Emulated right-click at [${x}, ${y}]`);
        } catch (e) {}
      }
    });

    socket.on("mouse-wheel", async ({ deltaX, deltaY }) => {
      if (page) {
        try {
          await page.mouse.wheel({ deltaX, deltaY });
        } catch (e) {}
      }
    });

    socket.on("keyboard-type", async ({ text }) => {
      if (page) {
        try {
          await page.keyboard.type(text);
          console.log(`LimeAPI: Emulated typing [${text}]`);
        } catch (e) {}
      }
    });

    socket.on("keyboard-press", async ({ key }) => {
      if (page) {
        try {
          await page.keyboard.press(key);
          console.log(`LimeAPI: Emulated key press [${key}]`);
        } catch (e) {}
      }
    });

    socket.on("get-files", () => {
      socket.emit("files-list", virtualFiles);
    });

    socket.on("delete-file", (id) => {
      virtualFiles = virtualFiles.filter(f => f.id !== id);
      io.emit("files-list", virtualFiles);
    });

    const streamFrames = async (targetSocket: any) => {
      if (!isStreaming || !page || page.isClosed()) return;
      
      // Prevent concurrent screenshots which cause lag or memory pressure
      if ((page as any)._isCapturing) return;
      (page as any)._isCapturing = true;

      try {
        const buffer = await page.screenshot({
          type: "jpeg",
          quality: 50, // Balanced quality/speed
          optimizeForSpeed: true
        });

        if (targetSocket.connected) {
          targetSocket.emit("frame", buffer);
        }
        
        (page as any)._isCapturing = false;
        // High-frequency sync
        requestAnimationFrameSync(targetSocket);
      } catch (e) {
        (page as any)._isCapturing = false;
        setTimeout(() => streamFrames(targetSocket), 100);
      }
    };

    const requestAnimationFrameSync = (targetSocket: any) => {
      // Aim for high FPS but respect event loop
      setImmediate(() => streamFrames(targetSocket));
    };
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "Lime Node Active", node: "Node_14", sync: "Cluster_Sync_Primary" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`LimeVM Server running on http://localhost:${PORT}`);
  });
}

startServer();
