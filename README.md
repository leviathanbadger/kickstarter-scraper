# kickstarter-scraper

Lets me know when kickstarter tiers become available.

# Build docker image

```bash
docker image build -t kickstarter-scraper:latest -f Dockerfile .
```

# Run docker image

```bash
docker container run --rm kickstarter-scraper:latest
```
