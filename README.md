# msfs-websim

A web based simulator for Microsoft Flght Simulator's html gauges /
avionics. It runs in a browser and supports javascript debugging and
inspection via the browser devtool.

https://user-images.githubusercontent.com/213300/103544735-39238200-4ea9-11eb-93f3-69dd85c6d78f.mp4

Prerequisites
-------------

[node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), 
Chrome (other browsers may work but they were not tested).

Setup
-----

1. Run `npm install` to install dependency packages
2. You may need to adjust the following configuration parameters 
with `npm config set msfs-websim:<param> <value>`. The paths should be 
autodected if not set (just for for the MS store version for now).

   * msfs_install_dir - base install dir for MSFS
     (e.g. D:/steam/steamapps/common/MicrosoftFlightSimulator/, 
      C:\Program Files\WindowsApps\Microsoft.FlightSimulator_1.15.8.0_x64__8wekyb3d8bbwe)

   * msfs_packages_dir - packages dir for MSFS (e.g. D:/msfs2020)

Run
----

1. Run `npm start`
2. Point your browser at http://localhost:8080
