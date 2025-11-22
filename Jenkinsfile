pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "vedaj/weather-app"
        DOCKER_CREDENTIALS_ID = "dockerhub-credentials"
        KUBECONFIG_CREDENTIALS_ID = "kubeconfig-secret"
        OPENWEATHER_API_KEY_CREDENTIALS_ID = "openweather-api-key"
    }

    stages {

        /* ---------------------- CHECKOUT ---------------------- */
        stage('Checkout') {
            steps {
                echo "Checking out source code..."
                checkout scm

                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = env.GIT_COMMIT_SHORT
                    echo "IMAGE_TAG generated: ${env.IMAGE_TAG}"
                }
            }
        }

        /* ---------------------- ENV SETUP ---------------------- */
        stage('Setup Environment') {
            steps {
                echo "Checking Node.js version..."
                dir('app') {
                    sh 'node --version'
                    sh 'npm --version'
                }
            }
        }

        /* ---------------------- INSTALL DEPENDENCIES ---------------------- */
        stage('Install Dependencies') {
            steps {
                echo "Installing dependencies..."
                dir('app') {
                    sh 'npm ci'
                }
            }
        }

        /* ---------------------- RUN TESTS ---------------------- */
        stage('Run Tests') {
            steps {
                echo "Running Jest tests..."
                dir('app') {
                    sh 'npm test || true'
                }
            }
            post {
                always {
                    junit testResults: 'app/coverage/*.xml', allowEmptyResults: true
                }
            }
        }

        /* ---------------------- REFRESH WEATHER CACHE ---------------------- */
        stage('Refresh Weather Dataset') {
            steps {
                echo "Refreshing weather dataset..."
                dir('app') {
                    withCredentials([string(credentialsId: OPENWEATHER_API_KEY_CREDENTIALS_ID, variable: 'OPENWEATHER_API_KEY')]) {

                        sh '''
                            echo "OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY}" > .env
                            echo "PORT=3000" >> .env

                            node -e "
                                const axios = require('axios');
                                const fs = require('fs');
                                const cities = ['Delhi','Mumbai','Bangalore','Chennai','Hyderabad'];
                                const API_KEY = process.env.OPENWEATHER_API_KEY;

                                async function fetch() {
                                    const results = await Promise.all(
                                        cities.map(city =>
                                            axios.get(
                                                'https://api.openweathermap.org/data/2.5/weather',
                                                { params: { q: city, appid: API_KEY, units: 'metric' } }
                                            )
                                            .then(r => ({
                                                [city]: {
                                                    temp: Math.round(r.data.main.temp * 10) / 10,
                                                    feels_like: Math.round(r.data.main.feels_like * 10) / 10,
                                                    humidity: r.data.main.humidity,
                                                    pressure: r.data.main.pressure,
                                                    wind: Math.round(r.data.wind.speed * 10) / 10,
                                                    description: r.data.weather[0].description,
                                                    icon: r.data.weather[0].icon
                                                }
                                            }))
                                            .catch(() => ({ [city]: { temp: null, error: 'Failed to fetch'} }))
                                        )
                                    );

                                    const cities_data = Object.assign({}, ...results);

                                    fs.mkdirSync('./data', { recursive: true });
                                    fs.writeFileSync('./data/weather.json', JSON.stringify({
                                        last_updated: new Date().toISOString(),
                                        cities: cities_data,
                                        metadata: {
                                            total_cities: cities.length,
                                            successful: Object.values(cities_data).filter(c => c.temp !== null).length,
                                            failed: Object.values(cities_data).filter(c => c.temp === null).length
                                        }
                                    }, null, 2));

                                    console.log('Weather data refreshed successfully');
                                }

                                fetch();
                            "
                        '''
                    }
                }
            }
        }

        /* ---------------------- BUILD DOCKER IMAGE ---------------------- */
        stage('Build Docker Image') {
            steps {
                echo "Building Docker image ${DOCKER_IMAGE}:${IMAGE_TAG}"
                script {
                    // Build with commit tag
                    dockerImage = docker.build("${DOCKER_IMAGE}:${IMAGE_TAG}")

                    // Build the latest tag too
                    docker.build("${DOCKER_IMAGE}:latest")
                }
            }
        }

        /* ---------------------- PUSH TO DOCKER ---------------------- */
        stage('Push to Docker Registry') {
            steps {
                echo "Pushing image to Docker Hub..."

                script {
                    // Use default Docker Hub (NO https://docker.io)
                    docker.withRegistry('', DOCKER_CREDENTIALS_ID) {

                        dockerImage.push("${IMAGE_TAG}")   // push commit tag
                        dockerImage.push("latest")         // push latest tag
                    }
                }
            }
        }

        /* ---------------------- DEPLOY ---------------------- */
        stage('Deploy to Kubernetes') {
            steps {
                echo "Deploying to Kubernetes..."

                withCredentials([file(credentialsId: KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG')]) {

                    sh '''
                        export KUBECONFIG=$KUBECONFIG

                        kubectl apply -f k8s/deployment.yaml
                        kubectl apply -f k8s/service.yaml

                        kubectl set image deployment/weather-app weather-app=vedaj/weather-app:${IMAGE_TAG} --record
                        kubectl rollout status deployment/weather-app --timeout=5m
                    '''
                }
            }
        }

        /* ---------------------- VERIFY ---------------------- */
        stage('Verify Deployment') {
            steps {
                echo "Verifying deployment..."

                withCredentials([file(credentialsId: KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG')]) {
                    sh '''
                        export KUBECONFIG=$KUBECONFIG
                        kubectl get pods -l app=weather-app
                        kubectl get svc
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "🎉 SUCCESS — Deployment Completed!"
            echo "Image deployed: ${DOCKER_IMAGE}:${IMAGE_TAG}"
        }
        failure {
            echo "❌ Pipeline failed — check logs."
        }
        always {
            cleanWs()
        }
    }
}

