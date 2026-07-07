import sharp from "sharp";
import fs from "fs";

const sizes = [192, 256, 384, 512];

async function generateIcons() {
    fs.mkdirSync("public/icons", { recursive: true });
    for (const size of sizes) {
        await sharp("public/icon.png")
        .resize(size, size)
        .toFile(`public/icons/icon-${size}.png`);

        console.log(`✔️ Icon ${size}x${size} generated`);
    }
}

generateIcons();
