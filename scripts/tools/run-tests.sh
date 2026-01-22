#!/usr/bin/env bash
set -euo pipefail

# Run unit + integration suites sequentially to reduce resource spikes

dotnet test /m:1 /p:BuildInParallel=false /p:NodeReuse=false /p:UseSharedCompilation=false "$@" "../../tests/UnitTests/Lab 1/AttemptService.UnitTests/AttemptService.UnitTests.csproj"
dotnet test /m:1 /p:BuildInParallel=false /p:NodeReuse=false /p:UseSharedCompilation=false "$@" "../../tests/UnitTests/Lab 1/AuthService.UnitTests/AuthService.UnitTests.csproj"
dotnet test /m:1 /p:BuildInParallel=false /p:NodeReuse=false /p:UseSharedCompilation=false "$@" "../../tests/UnitTests/Lab 1/CourseService.UnitTests/CourseService.UnitTests.csproj"
dotnet test /m:1 /p:BuildInParallel=false /p:NodeReuse=false /p:UseSharedCompilation=false "$@" "../../tests/UnitTests/Lab 1/ExamService.UnitTest/ExamService.UnitTest.csproj"
dotnet test /m:1 /p:BuildInParallel=false /p:NodeReuse=false /p:UseSharedCompilation=false "$@" "../../tests/UnitTests/Lab 1/VocabularyService.UnitTests/VocabularyService.UnitTests.csproj"
dotnet test /m:1 /p:BuildInParallel=false /p:NodeReuse=false /p:UseSharedCompilation=false "$@" "../../tests/UnitTests/Lab 1/EmailService.UnitTests/EmailService.UnitTests.csproj"
dotnet test /m:1 /p:BuildInParallel=false /p:NodeReuse=false /p:UseSharedCompilation=false "$@" "../../tests/UnitTests/Lab 1/IntegrationTests/IntegrationTests.csproj"
