# Custom Firebot script to get live events from LiveSplit 
Creates a TCP connection to the [LiveSplit Remote Plugin](https://github.com/Lordmau5/LiveSplitRemotePlugin). Simply copy the livesplitEvents.js file into your Firebot scripts folder to user, or you can make a new one following the steps below. 

Worth noting that the LiveSplit Remote Plugin *does* send the current timer data, which I have not yet integrated into the script in any meaningful way. 

### Setup
1. Create a new repo based off this template (Click "Use this Template" above) or simply fork it
2. `npm install`

### Building
Dev:
1. `npm run build:dev`
- Automatically copies the compiled .js to Firebot's scripts folder.

Release:
1. `npm run build`
- Copy .js from `/dist`

### Note
- Keep the script definition object (that contains the `run`, `getScriptManifest`, and `getDefaultParameters` funcs) in the `index.ts` file as it's important those function names don't get minimized.
- Edit the `"scriptOutputName"` property in `package.json` to change the filename of the outputted script.
