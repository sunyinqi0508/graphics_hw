import cv2
import numpy as np
import math
mat = cv2.imread('starburst.png')
mat2 = np.zeros((900, 1273, 3))
print(mat.shape)
rad = 0
for i in range(0, 900):
    dt = 0
    s = math.sin(rad)
    c = math.cos(rad)
    for j in range(0, 1273):
        # if(dt*c > 913 or dt*c < -913 or dt * s > 900 or dt*s < -900):
        #     break
        x = 900+int(dt*s)
        x = x if x < 1800 else 1799
        y = 913+int(dt*c)
        y = y if y < 1826 else 1799

        mat2[i][j] = mat[900+int(dt*s)][913+int(dt*c)]
        dt += 1
    rad += .007
cv2.imwrite('starburst3.png',mat2)
cv2.imshow('a', mat2)
cv2.waitKey(0)