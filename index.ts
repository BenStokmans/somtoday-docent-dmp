import axios from "axios"
import fs from "fs"
import { SourceMapConsumer } from "source-map";
import { dirname } from 'path';

const root: string = "https://docent.somtoday.nl";
var outDir: string = "source-dump"
var distDir: string = "source-dump/dist"

const ngsw = await axios.get(`${root}/ngsw.json`);
const assetGroups = ngsw.data.assetGroups;
let appUrls: Array<string> = new Array<string>;
let assetUrls: Array<string> = new Array<string>;

// get asset group 
assetGroups.forEach((g: any) => {
    if (g.name == "app") {
        appUrls = g.urls;
    }
    if (g.name == "assets") {
        assetUrls = g.urls;
    }
})

// find all javascript and css files 
let appFiles: Array<string> = new Array<string>;
appUrls.forEach((url) => {
    if (url.match(`\/.*?\.(js|css)`)) {
        appFiles.push(url);
    }
})

// erase old and create new directory
if (fs.existsSync(outDir)){
    fs.rmSync(outDir, {recursive: true});
}
fs.mkdirSync(outDir);

if (!fs.existsSync(distDir)){
    fs.mkdirSync(distDir);
}

// create source dir
if (!fs.existsSync(outDir + "/src")) {
    fs.mkdirSync(outDir + "/src");
}

appFiles.forEach(async (url) => {
    const sourceResp = await axios.get(root + url);
    const mapResp = await axios.get(root + url + ".map");
    const source = sourceResp.data;
    const map = mapResp.data;

    fs.writeFileSync(distDir + url, source);
    fs.writeFileSync(distDir + url + ".map", JSON.stringify(map));

    console.log(`unpacking: ${url}`);
    SourceMapConsumer.with(map, null, (consumer: SourceMapConsumer) => {
        const sources = (consumer as any).sources;
        sources.forEach((source: string) => {
          const WEBPACK_SUBSTRING_INDEX = 11;
          const content = consumer.sourceContentFor(source) as string;
          const filePath = `${outDir}/${source.substring(WEBPACK_SUBSTRING_INDEX)}`;

          fs.mkdirSync(dirname(filePath), {recursive: true});
          fs.writeFileSync(filePath, content);
        });
      });
});

const indexResp = await axios.get(root + "/index.html");
fs.writeFileSync(outDir + "/src/index.html", indexResp.data);

// retrieve assets
assetUrls.forEach(async (url) => {
    const filePath = outDir + url;

    console.log(`downloading: ${url} to ${filePath}`);
    const resp = await axios.get(root + url);
    fs.mkdirSync(dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, resp.data);
});