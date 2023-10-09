# docker run -it --entrypoint /bin/bash -v ./:/app -p "80:80" stevenlafl/bspview
docker run -it --rm --name="bspview" -v ./:/app -p "80:80" stevenlafl/bspview