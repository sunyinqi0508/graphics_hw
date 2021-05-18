
function implicitSurfaceTriangleMesh(implicitFunction, n, args, id = 8) {

   // HERE IS WHERE MOST OF THE WORK HAPPENS

   let marchingTetrahedra = function(V, ni, nj) {

      // CONVENIENCE FUNCTIONS TO COMPUTE (i,j,k) FROM VOLUME INDEX n

      function n2i(n) { return  n             % ni; }
      function n2j(n) { return (n / dj >>> 0) % nj; }
      function n2k(n) { return  n / dk >>> 0      ; }

      // ADD A VERTEX, AND RETURN A UNIQUE ID FOR THAT VERTEX

      function E(a, b) {
         if (a > b) { let tmp = a; a = b; b = tmp; }
         let ai = n2i(a), aj = n2j(a), ak = n2k(a),
             bi = n2i(b), bj = n2j(b), bk = n2k(b);
         let m = (n << 6) + (ai & bi ?  1 << 6 : ai      | bi << 3)
                          + (aj & bj ? dj << 6 : aj << 1 | bj << 4)
                          + (ak & bk ? dk << 6 : ak << 2 | bk << 5);

         // ADD TO VERTEX ARRAY ONLY THE FIRST TIME THE VERTEX IS ENCOUNTERED

         if (vertexID[m] === undefined) {
            vertexID[m] = P.length / 3;
            let t = -V[n+a] / (V[n+b] - V[n+a]),
                c = function(i,a,b) { return (i + (1-t)*a + t*b) / ni * 2 - 1; };
            P.push( c(i,ai,bi), c(j,aj,bj), c(k,ak,bk) );
         }

         return vertexID[m];
      }

      // CASE WHERE WE ADD ONE TRIANGLE IN A TETRAHEDRON

      function tri(a, b, c, d) {
         T.push(E(a,b), E(a,c), E(a,d));
      }

      // CASE WHERE WE ADD TWO TRIANGLES IN A TETRAHEDRON

      function quad(a, b, c, d) {
         let ac = E(a,c), bc = E(b,c), ad = E(a,d), bd = E(b,d);
         T.push(bc, ac, ad);
         T.push(ad, bd, bc);
      }

      // DECLARE VARIABLES

      let nk = V.length / (ni * nj), di = 1, dj = ni, dk = ni * nj;
      let dij = di + dj, dik = di + dk, djk = dj + dk, dijk = di + dj + dk;
      let P = [], T = [], vertexID = [], i, j, k, m = 0, n, S = [0,di,dij,dijk];
      let lo = new Array(nj * nk),
          hi = new Array(nj * nk);

      // THE SIX POSSIBLE INTERMEDIATE PATHS THROUGH A TETRAHEDRON

      let S1 = [di , dj , dk , di , dj , dk ];
      let S2 = [dij, djk, dik, dik, dij, djk];

      // THERE ARE 16 CASES TO CONSIDER

      let cases = [ [0         ], [1, 0,1,2,3], [1, 1,2,0,3], [2, 0,1,2,3],
                    [1, 2,3,0,1], [2, 0,2,3,1], [2, 1,2,0,3], [1, 3,1,2,0],
                    [1, 3,0,2,1], [2, 0,3,1,2], [2, 1,3,2,0], [1, 2,1,0,3],
                    [2, 2,3,0,1], [1, 1,3,0,2], [1, 0,3,2,1], [0         ], ];

      // FOR EACH (Y,Z), DON'T DO ANY WORK OUTSIDE OF X RANGE WHERE SURFACE MIGHT BE
   
      for (k = 0 ; k < nk ; k++)
         for (j = 0 ; j < nj ; j++, m++) {
            let n0 = m * ni, n1 = n0 + ni - 1;
            for (n = n0 ; n <= n1 && V[n] > 0 ; n++) ;
            lo[m] = Math.max(0, n-1 - n0);
            for (n = n1 ; n >= n0 && V[n] > 0 ; --n) ;
            hi[m] = Math.min(ni-1, n+1 - n0);
         }

      // FOR ALL Y AND Z IN THE VOLUME

      for (k = 0 ; k < nk - 1 ; k++) {
         let i0, i1, m = k * nj, n1, s0, s1;
         for (j = 0 ; j < nj - 1 ; j++, m++) {
            i0 = Math.min(lo[m], lo[m+1], lo[m+ni], lo[m+1+ni]);
            i1 = Math.max(hi[m], hi[m+1], hi[m+ni], hi[m+1+ni]);

	    // GO THROUGH RANGE OF X WHERE THE SURFACE MIGHT BE (IE: WITH ANY POSITIVE VALUES)

            if (i0 <= i1) {
               n  = m * ni + i0;
               n1 = m * ni + i1;
               s0 = (V[n]>0) + (V[n+dj]>0) + (V[n+dk]>0) + (V[n+djk]>0);
               for (i = i0 ; n <= n1 ; i++, n++, s0 = s1) {

                  // FOR EACH CUBE

                  s1 = (V[n+di]>0) + (V[n+dij]>0) + (V[n+dik]>0) + (V[n+dijk]>0);
                  if (s0 + s1 & 7) {
                     let C14 = (V[n] > 0) | (V[n+dijk] > 0) << 3;

		     // CYCLE THROUGH THE SIX TETRAHEDRA THAT TILE THE CUBE

                     for (let p = 0 ; p < 6 ; p++) {
                        let C = cases [ C14 | (V[n+S1[p]] > 0) << 1 | (V[n+S2[p]] > 0) << 2 ];

			// FOR EACH TETRAHEDRON, OUTPUT EITHER ZERO, ONE OR TWO TRIANGLES

                        if (C[0]) {       // C[0] == number of triangles to be created.
                           S[1] = S1[p];  // assign 2nd and 3rd corners of simplex.
                           S[2] = S2[p];
                           (C[0]==1 ? tri : quad)(S[C[1]], S[C[2]], S[C[3]], S[C[4]]);
                        }
                     }
                  }
               }
            }
         }
      }

      // MAKE SURE ALL TRIANGLE VERTICES ARE LISTED IN COUNTERCLOCKWISE ORDER

      for (let m = 0 ; m < T.length ; m += 3) {
         let a = 3 * T[m], b = 3 * T[m+1], c = 3 * T[m+2],
             n = Math.floor(ni*(P[a  ]+1)/2)      +
	         Math.floor(ni*(P[a+1]+1)/2) * dj +
		 Math.floor(ni*(P[a+2]+1)/2) * dk,
             u = cross([P[b] - P[a], P[b+1] - P[a+1], P[b+2] - P[a+2]],
                       [P[c] - P[b], P[c+1] - P[b+1], P[c+2] - P[b+2]]),
             v = [ V[n+1] - V[n], V[n+dj] - V[n], V[n+dk] - V[n] ];
         if (dot(u, v) < 0) { let tmp = T[m]; T[m] = T[m + 2]; T[m + 2] = tmp; }
      }

      // RETURN POINTS AND TRIANGLES

      return [P, T];
   }

   // SAMPLE THE VOLUME

   let F = i => (i - n/2) / (n/2);
   let volume = [];

   for (let k = 0 ; k < n ; k++)
   for (let j = 0 ; j < n ; j++)
   for (let i = 0 ; i < n ; i++)
      volume.push(implicitFunction(F(i), F(j), F(k), args));

   // FIND ALL VERTICES AND TRIANGLES IN THE VOLUME
   
   let VT = marchingTetrahedra(volume, n, n);
   let V = VT[0];
   let T = VT[1];

   // COMPUTE SURFACE NORMALS

   let N = new Array(V.length);
   for (let i = 0 ; i < V.length ; i += 3) {
      let x = V[i], y = V[i+1], z = V[i+2], e = .001,
          f0 = implicitFunction(x  ,y  ,z  , args),
          fx = implicitFunction(x+e,y  ,z  , args),
          fy = implicitFunction(x  ,y+e,z  , args),
          fz = implicitFunction(x  ,y  ,z+e, args),
          normal = normalize([f0-fx,f0-fy,f0-fz]);
      for (let j = 0 ; j < 3 ; j++)
         N[i+j] = normal[j];
   }

   // CONSTRUCT AND RETURN THE TRIANGLES MESH

   let mesh = [];
   for (let i = 0; i < T.length; i += 3) {
      let a = 3 * T[i    ],
          b = 3 * T[i + 1],
	  c = 3 * T[i + 2];
      mesh.push( id, V[a],V[a+1],V[a+2] , N[a],N[a+1],N[a+2] ,
                 id, V[b],V[b+1],V[b+2] , N[b],N[b+1],N[b+2] ,
                 id, V[c],V[c+1],V[c+2] , N[c],N[c+1],N[c+2] );
   }
   return new Float32Array(mesh);
}

let blob = (center, radius, x, y, z) => {
   x -= center[0];
   y -= center[1];
   z -= center[2];
   return Math.max(0, 1 - .16 * (x*x + y*y + z*z) / (radius * radius));
}

var implicitFunction = (x,y,z,args) => {
   let ret = -.5;
   let x4 = _x => _x*_x*_x*_x;
   args.forEach((paras, _)=>{
      const center = paras[0],
            radius = paras[1];
      ret += x4(blob(center, radius, x, y, z));
   });
   return ret;
}

