# signalk-controller

Schedule based controller with a SignalK interface.

This project implements a plugin for the [Signal K Node server](https://github.com/SignalK/signalk-server-node).

Reading the [Alarm, alert and notification handling](http://signalk.org/specification/1.0.0/doc/notifications.html)
section of the Signal K documentation may provide helpful orientation.

## Principle of operation

__signalk-controller__ implements a conventional and non-conventional schedule
based controller which interfaces to a SignalK host through the host's
notification bus. The controller is implemented as a SignalK plugin and an
associated SignalK app which interacts with the plugin through a websocket
based communication protocol.

The SignalK plugin supports an arbitrary number of user defined control channels
and implements a real-time scheduler which automatically processes programmed
events across all channels. The plugin control interface allows schedule inception,
programming, and override.

The SignalK app provides a web-control interface to the controller which supports
programme construction and controller operation.
