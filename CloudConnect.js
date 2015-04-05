/*
The MIT License (MIT)

Copyright (c) 2015 dambis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
var pkgcloud = require('pkgcloud'),
    _ = require('underscore');
var program = require('commander');
var fileSystem = require('fs');

program
  .version('1.0.0')
  .option('-c, --cloudProvider <cloudProvider>', 'Cloud Provider', /^(Amazon|Azure|DigitalOcean|HP|Joyent|Openstack|Rackspace)$/i, 'Openstack')
  .option('-u, --userName <userName>', 'User Name')
  .option('-p, --password <password>', 'Password')
  .option('-r, --region <region>', 'Region', /^(RegionOne)$/i, 'RegionOne')
  .option('-a, --authUrl <authUrl>', 'Authentical Url')
  .option('-e, --requiredEnvironment <requiredEnvironment>', 'Required Environment Configuration')
  .parse(process.argv);

console.log("You Entered");
console.log("-c Cloud Provider : %j", program.cloudProvider);
console.log("-u User name : %j", program.userName);
console.log("-r Region : %j", program.region);
console.log("-a AuthUrl: %j", program.authUrl);
console.log("-e RequiredEnvironment: %j", program.requiredEnvironment);

var environmentJsonString = fileSystem.readFileSync(program.requiredEnvironment, "UTF-8");
var reqdEnvironments = JSON.parse(environmentJsonString);

console.log("Hang on folks... we are connecting to cloud now..")

/* create our client with your openstack credentials */
var client = pkgcloud.compute.createClient({
    provider: program.cloudProvider,
    username: program.userName,
    password: program.password,
    region: program.region,
    authUrl: program.authUrl
});

console.log("Yippie... we are in cloud now..")

var availableFlavours;
var availableImages;

// first we're going to get our flavors
client.getFlavors(function (err, flavors) {
    if (err) {
        console.dir(err);
        return;
    }

    availableFlavours = flavors;
    console.log("Got all the available flavours...going for images now");


    // then get our base images
    client.getImages(function (err, images) {
        if (err) {
            console.dir(err);
            return;
        }

        availableImages = images;
        console.log("Got all the available images...get ready I am going for your environment creation now");


        try {
            _.each(reqdEnvironments.environmentInstances, function (environment) {
                createInstance(environment, client)
            });
        }
        catch (exception) {
            console.dir(ex);
            return;
        }
    });
});

function createInstance(environment, cloudClient) {
    // Pick the required flavour
    var flavour = _.findWhere(availableFlavours, { name: environment.flavour });

    //Pick the required image.
    var image = _.findWhere(availableImages, { name: environment.image }); // Check if this version is correct

    // Create instance
    cloudClient.createServer({
        name: environment.name,
        image: image,
        flavor: flavour
    }, handleServerResponse);
}

// This function will handle our server creation,
// as well as waiting for the server to come online after we've
// created it.
function handleServerResponse(err, server) {
    if (err) {
        console.dir(err);
        return;
    }

    console.log('INSTANCE CREATED: ' + server.name + ', waiting for active status');

    // Wait for status: RUNNING on our server, and then callback
    server.setWait({ status: server.STATUS.running }, 5000, function (err) {
        if (err) {
            console.dir(err);
            return;
        }

        console.log('INSTANCE INFO => %j  | %j     |   %j | %j', server.id, server.name, server.status, server.addresses.private);
    });
}