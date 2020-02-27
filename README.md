# signalk-controller

Schedule based controller with a SignalK interface.

This project implements a plugin for the [Signal K Node server](https://github.com/SignalK/signalk-server-node).

Reading the [Alarm, alert and notification handling](http://signalk.org/specification/1.0.0/doc/notifications.html)
section of the Signal K documentation may provide helpful orientation.

## Principle of operation

__signalk-controller__ implements a conventional and non-conventional schedule
based controller which interfaces to a SignalK host through the host's
notification bus. The controller is implemented as SignalK plugin and an
associated SignalK app which interacts with the plugin through a websocket
based communication protocol.

The SignalK plugin implements the following features:

1. Supports an arbitrary number of user defined control channels.
2. Implements a real-time scheduler which automatically processed programmed
   events across all channels.
3.  although the application could be ab
