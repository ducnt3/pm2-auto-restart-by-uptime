var pmx = require('pmx');
var pm2 = require('pm2');
var async = require('async');
var pkg = require('./package.json');

var Probe = pmx.probe();

var app_updated = Probe.counter({
  name: 'Updates'
});

function autoWatchForUptime(conf, cb) {
  if (!conf.maxUptimeMS) {
    conf.maxUptimeMS = 1000 * 60 * 5;
  }
  pm2.list(function(err, procs) {
    if (err) return console.error(err);
    async.forEachLimit(procs, 1, function(proc, next) {
      if (!proc.pm2_env.pmx_module) {
        const uptimeMS = (new Date().getTime() - proc.pm2_env.pm_uptime);
        console.log({
          uptimeMS,
          maxUptimeMS: conf.maxUptimeMS
        });
        if (uptimeMS > conf.maxUptimeMS) {
          console.log("NOT OK");
          pm2.reload(proc.name, function(err) {
            if (err) {
              console.log('Failed to reload application %s', proc.name);
            } else {
              console.log('>>>>>>>>>>>>> Successfully reload Application! [App name: %s]', proc.name)
            }
            return next();
          });
        } else {
          next();
        }
      }
	  else {
		  next();
	  }
    }, cb);

  });
}

pmx.initModule({
  widget: {
    type: 'generic',
    theme: ['#111111', '#1B2228', '#807C7C', '#807C7C'],

    el: {
      probes: true,
      actions: true
    },

    block: {
      actions: true,
      issues: true,
      meta: true,
      cpu: true,
      mem: true
    }

    // Status
    // Green / Yellow / Red
  }
}, function(err, conf) {
  pm2.connect(function() {
    console.log('pm2-auto-restart-by-uptime module connected to pm2');

    var running = false;

    setInterval(function() {
      if (running == true) return false;

      running = true;
      autoWatchForUptime(conf, function() {
        running = false;
      });
    }, conf.interval || 1000 * 5);

  });
});
