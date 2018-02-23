'use strict';

const Homey = require('homey');

class MiFloraDriver extends Homey.Driver {

    onPairListDevices( data, callback ){
        callback( null, [
            {
                name: 'Foo Device',
                data: {
                    id: 'foo'
                }
            }
        ]);

    }

}

module.exports = MiFloraDriver;