(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [892],
  {
    5420: function (e, r, t) {
      'use strict';
      t.r(r),
        t.d(r, {
          default: function () {
            return l;
          }
        });
      var n = t(8316),
        i = t(1510),
        s = t(2945),
        u = t(7109),
        c = t(3e3),
        a = t(8943),
        o = t(9720),
        d = t(1738),
        h = [
          {
            id: 'id',
            header: 'User id',
            cell: function (e) {
              return e.id;
            },
            sortingField: 'id'
          }
        ],
        f = t(1030),
        l = function () {
          (0, n.rV)().settings;
          var e = (0, n.UV)(),
            r = e.users,
            t = (e.mutate, (0, d.useState)('')),
            l = t[0];
          t[1];
          return (0, f.jsx)(n.IE, {
            breadcrumbs: [
              { text: 'Service Workbench', href: '/' },
              { text: 'Users', href: '/users' }
            ],
            activeHref: '/users',
            children: (0, f.jsxs)(i.Z, {
              margin: { bottom: 'l' },
              children: [
                !!l && (0, f.jsx)(s.Z, { type: 'error', children: l }),
                (0, f.jsx)(u.Z, {
                  header: (0, f.jsx)(f.Fragment, {
                    children: (0, f.jsx)(c.Z, {
                      actions: (0, f.jsx)(i.Z, {
                        float: 'right',
                        children: (0, f.jsx)(a.Z, {
                          direction: 'horizontal',
                          size: 'xs',
                          children: (0, f.jsx)(o.Z, {
                            variant: 'primary',
                            href: '/users/new',
                            children: 'Create Researcher'
                          })
                        })
                      }),
                      children: 'Users'
                    })
                  }),
                  columnDefinitions: h,
                  loadingText: 'Loading users',
                  items: r
                })
              ]
            })
          });
        };
    },
    2945: function (e, r, t) {
      'use strict';
      t.d(r, {
        Z: function () {
          return a;
        }
      });
      var n = t(4997),
        i = t(1738),
        s = t(4754),
        u = t(6430),
        c = t(822);
      function a(e) {
        var r = e.type,
          t = void 0 === r ? 'success' : r,
          u = e.wrapText,
          a = void 0 === u || u,
          o = (0, n._T)(e, ['type', 'wrapText']),
          d = (0, c.Z)('StatusIndicator');
        return i.createElement(s.Z, (0, n.pi)({ type: t, wrapText: a }, o, d));
      }
      (0, u.b)(a, 'StatusIndicator');
    },
    5403: function (e, r, t) {
      (window.__NEXT_P = window.__NEXT_P || []).push([
        '/users',
        function () {
          return t(5420);
        }
      ]);
    }
  },
  function (e) {
    e.O(0, [874, 774, 888, 179], function () {
      return (r = 5403), e((e.s = r));
      var r;
    });
    var r = e.O();
    _N_E = r;
  }
]);
